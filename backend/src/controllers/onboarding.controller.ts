import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import axios from 'axios';

const prisma = new PrismaClient();
const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:8000';

// Start onboarding conversation (for AI - kept for future use)
export const startOnboarding = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    
    // Get user's first name
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { firstName: true }
    });

    // For now, return a simple response (AI will be implemented later)
    res.json({
      success: true,
      data: {
        question: `Welcome ${user?.firstName || 'there'}! Let's get started with your onboarding.`,
        completed: false,
        next_step: 'education_level'
      }
    });
  } catch (error: any) {
    console.error('Start onboarding error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to start onboarding'
    });
  }
};

// Submit complete onboarding data (form-based, no AI)
export const submitOnboardingData = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const data = req.body;

    // Save onboarding data directly
    await saveOnboardingData(userId, data);

    res.json({
      success: true,
      message: 'Onboarding completed successfully'
    });
  } catch (error: any) {
    console.error('Submit onboarding data error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to save onboarding data'
    });
  }
};

// Submit answer to onboarding question (for AI - kept for future use)
export const submitAnswer = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const { answer } = req.body;

    if (!answer) {
      return res.status(400).json({
        success: false,
        error: 'Answer is required'
      });
    }

    // For now, return a simple response (AI will be implemented later)
    res.json({
      success: true,
      data: {
        question: 'Thank you for your answer. Please continue with the form.',
        completed: false,
        next_step: 'continue'
      }
    });
  } catch (error: any) {
    console.error('Submit answer error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to submit answer'
    });
  }
};

// Get onboarding status
export const getOnboardingStatus = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;

    // Check if user has completed onboarding by checking if educationLevel is set
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        educationLevel: true,
        institution: true,
        firstName: true,
        lastName: true
      }
    });

    const completed = !!user?.educationLevel;

    res.json({
      success: true,
      data: {
        completed,
        userData: user
      }
    });
  } catch (error: any) {
    console.error('Get onboarding status error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get onboarding status'
    });
  }
};

// Helper function to save onboarding data
async function saveOnboardingData(userId: string, data: any) {
  try {
    // Update user with education info (handle both snake_case and camelCase)
    const updateData: any = {
      educationLevel: data.education_level || data.educationLevel,
      institution: data.institution || null,
      board: data.board || null,
      expectedGraduation: data.expectedGraduation ? new Date(data.expectedGraduation) : null
    };

    // School-specific
    if (data.class) updateData.class = data.class.toString();
    if (data.group) updateData.group = data.group;
    
    // College/University-specific
    if (data.year) updateData.year = parseInt(data.year.toString());
    if (data.major) updateData.major = data.major;
    
    await prisma.user.update({
      where: { id: userId },
      data: updateData
    });

    // Store additional education fields in AIMemory metadata
    const additionalFields: any = {};
    if (data.medium) additionalFields.medium = data.medium;
    if (data.department) additionalFields.department = data.department;
    if (data.semester) additionalFields.semester = data.semester;
    if (data.researchArea) additionalFields.researchArea = data.researchArea;
    if (data.program) additionalFields.program = data.program;

    if (Object.keys(additionalFields).length > 0) {
      // Store in AIMemory as onboarding metadata
      await prisma.aIMemory.create({
        data: {
          userId,
          type: 'onboarding',
          chromaId: `onboarding-${userId}-${Date.now()}`,
          metadata: {
            source: 'onboarding',
            educationDetails: additionalFields
          }
        }
      });
    }

    // Create courses (for university/graduate)
    if (data.courses && Array.isArray(data.courses)) {
      for (const course of data.courses) {
        await prisma.course.create({
          data: {
            userId,
            courseName: course.name || course.courseName,
            courseCode: course.code || course.courseCode || `COURSE-${Date.now()}`,
            credits: course.credits ? parseInt(course.credits.toString()) : 3
          }
        });
      }
    }

    // Create subjects as courses (for school/college)
    // Store subjects as courses with a special tag or in description
    if (data.subjects && Array.isArray(data.subjects)) {
      for (const subject of data.subjects) {
        await prisma.course.create({
          data: {
            userId,
            courseName: subject,
            courseCode: `SUBJECT-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            credits: null,
            description: 'Subject from onboarding'
          }
        });
      }
    }

    // Create skills
    const skills = data.skill_goals || data.skills || [];
    if (Array.isArray(skills) && skills.length > 0) {
      for (const skill of skills) {
        await prisma.skill.create({
          data: {
            userId,
            name: skill.name,
            category: skill.category || 'General',
            level: (skill.current_level || skill.level || 'beginner').toLowerCase()
          }
        });
      }
    }

    // Create monthly budget record (Finance model is for transactions, not budgets)
    const financialData = data.financial_situation || data.financial || {};
    if (financialData.monthly_budget || financialData.monthlyBudget) {
      const now = new Date();
      const monthlyBudget = financialData.monthly_budget || financialData.monthlyBudget || 0;
      
      if (monthlyBudget > 0) {
        await prisma.monthlyBudget.create({
          data: {
            userId,
            title: 'General Monthly Budget',
            targetAmount: parseFloat(monthlyBudget.toString()),
            currentAmount: 0,
            category: 'general',
            month: now.getMonth() + 1,
            year: now.getFullYear()
          }
        });
      }
    }

    // Save conversation to AIMemory for future reference
    await prisma.aIMemory.create({
      data: {
        userId,
        chromaId: `onboarding-${userId}-${Date.now()}`,
        type: 'chat',
        metadata: {
          source: 'onboarding',
          topic: 'user_setup',
          data: data
        }
      }
    });

    console.log('Onboarding data saved successfully for user:', userId);
  } catch (error) {
    console.error('Error saving onboarding data:', error);
    throw error;
  }
}
