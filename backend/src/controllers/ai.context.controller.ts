import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { ingestDocs, deleteContextFromChromaDB } from '../services/ai.service';

const prisma = new PrismaClient();

// Get all user context (structured + unstructured)
export const getContext = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;

    // Fetch structured data from PostgreSQL
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        firstName: true,
        lastName: true,
        educationLevel: true,
        institution: true,
        class: true,
        group: true,
        year: true,
        major: true,
        board: true,
        expectedGraduation: true,
        unstructuredContext: true
      }
    });

    const courses = await prisma.course.findMany({
      where: { userId },
      select: {
        courseName: true,
        courseCode: true,
        credits: true
      }
    });

    const skills = await prisma.skill.findMany({
      where: { userId },
      select: {
        name: true,
        category: true,
        level: true
      }
    });

    const monthlyBudgets = await prisma.monthlyBudget.findMany({
      where: { userId },
      select: {
        title: true,
        targetAmount: true,
        category: true
      },
      take: 1,
      orderBy: { createdAt: 'desc' }
    });

    // Build structured context
    const structured = {
      user: {
        firstName: user?.firstName || '',
        lastName: user?.lastName || '',
        educationLevel: user?.educationLevel || '',
        institution: user?.institution || '',
        class: user?.class || '',
        group: user?.group || '',
        year: user?.year || null,
        major: user?.major || '',
        board: user?.board || '',
        expectedGraduation: user?.expectedGraduation || null
      },
      courses: courses.map(c => ({
        name: c.courseName,
        code: c.courseCode,
        credits: c.credits
      })),
      skills: skills.map(s => ({
        name: s.name,
        category: s.category,
        level: s.level
      })),
      finances: monthlyBudgets.length > 0 ? {
        monthlyBudget: monthlyBudgets[0].targetAmount,
        category: monthlyBudgets[0].category
      } : null
    };

    // Get unstructured context from PostgreSQL (user-editable context)
    const unstructured = user?.unstructuredContext || '';

    res.json({
      success: true,
      data: {
        structured,
        unstructured
      }
    });
  } catch (error: any) {
    console.error('Get context error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get context'
    });
  }
};

// Update user context
export const updateContext = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const { structured, unstructured } = req.body;

    // Update structured data in PostgreSQL
    if (structured) {
      if (structured.user) {
        await prisma.user.update({
          where: { id: userId },
          data: {
            firstName: structured.user.firstName || undefined,
            lastName: structured.user.lastName || undefined,
            educationLevel: structured.user.educationLevel || undefined,
            institution: structured.user.institution || undefined,
            class: structured.user.class || undefined,
            group: structured.user.group || undefined,
            year: structured.user.year || undefined,
            major: structured.user.major || undefined,
            board: structured.user.board || undefined,
            expectedGraduation: structured.user.expectedGraduation 
              ? new Date(structured.user.expectedGraduation) 
              : undefined
          }
        });
      }

      // Update courses (delete old, create new)
      if (structured.courses) {
        await prisma.course.deleteMany({ where: { userId } });
        for (const course of structured.courses) {
          await prisma.course.create({
            data: {
              userId,
              courseName: course.name,
              courseCode: course.code || `COURSE-${Date.now()}`,
              credits: course.credits || null
            }
          });
        }
      }

      // Update skills (delete old, create new)
      if (structured.skills) {
        await prisma.skill.deleteMany({ where: { userId } });
        for (const skill of structured.skills) {
          await prisma.skill.create({
            data: {
              userId,
              name: skill.name,
              category: skill.category || 'General',
              level: (skill.level || 'beginner').toLowerCase()
            }
          });
        }
      }

      // Update finances
      if (structured.finances) {
        const existing = await prisma.monthlyBudget.findFirst({
          where: { userId },
          orderBy: { createdAt: 'desc' }
        });
        
        if (existing) {
          await prisma.monthlyBudget.update({
            where: { id: existing.id },
            data: {
              targetAmount: structured.finances.monthlyBudget || 0
            }
          });
        } else if (structured.finances.monthlyBudget) {
          const now = new Date();
          await prisma.monthlyBudget.create({
            data: {
              userId,
              title: 'General Monthly Budget',
              targetAmount: structured.finances.monthlyBudget,
              currentAmount: 0,
              category: structured.finances.category || 'general',
              month: now.getMonth() + 1,
              year: now.getFullYear()
            }
          });
        }
      }
    }

    // Update unstructured data in PostgreSQL and ChromaDB
    if (unstructured !== undefined && typeof unstructured === 'string') {
      // Save to PostgreSQL for easy retrieval
      await prisma.user.update({
        where: { id: userId },
        data: {
          unstructuredContext: unstructured
        }
      });

      // Also save to ChromaDB for AI context retrieval
      // IMPORTANT: Delete old context documents first to ensure AI only uses latest version
      if (unstructured.trim()) {
        try {
          // Delete all old context documents before adding new one
          // This ensures the AI forgets removed/previous context
          await deleteContextFromChromaDB(userId);
          
          // Now add the new context document
          const contextId = `context_${userId}_latest`;
          await ingestDocs({
            user_id: userId,
            docs: [{
              id: `${contextId}_${Date.now()}`, // Add timestamp for uniqueness
              text: unstructured,
              meta: {
                type: 'context',
                source: 'user_edit',
                timestamp: new Date().toISOString(),
                priority: 'high' // Mark as high priority for retrieval
              }
            }]
          });
        } catch (error) {
          console.error('Error updating unstructured context in ChromaDB:', error);
          // Continue even if ChromaDB update fails
        }
      } else {
        // If unstructured context is empty, delete all old context documents
        try {
          await deleteContextFromChromaDB(userId);
        } catch (error) {
          console.error('Error deleting empty context from ChromaDB:', error);
          // Continue even if deletion fails
        }
      }
    }

    res.json({
      success: true,
      message: 'Context updated successfully'
    });
  } catch (error: any) {
    console.error('Update context error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to update context'
    });
  }
};

