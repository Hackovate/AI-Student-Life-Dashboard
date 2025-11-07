import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { chatAI } from '../services/ai.service';

const prisma = new PrismaClient();

export const chat = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const { message, conversation_history } = req.body;

    if (!message) {
      return res.status(400).json({
        success: false,
        error: 'Message is required'
      });
    }

    // Get user's first and last name from database
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { 
        firstName: true, 
        lastName: true,
        educationLevel: true,
        institution: true,
        major: true,
        unstructuredContext: true
      }
    });

    const userName = user 
      ? `${user.firstName || ''} ${user.lastName || ''}`.trim()
      : undefined;

    // Get structured context summary for AI
    const courses = await prisma.course.findMany({
      where: { userId },
      select: { courseName: true },
      take: 5
    });

    const skills = await prisma.skill.findMany({
      where: { userId },
      select: { name: true, category: true, level: true }
    });

    // Get recent daily plans (last 7 days)
    const recentPlans = await prisma.aIPlan.findMany({
      where: { userId },
      orderBy: { date: 'desc' },
      take: 3,
      select: {
        date: true,
        summary: true,
        planJson: true
      }
    });

    // Build structured context summary
    const structuredContextParts: string[] = [];
    if (user?.educationLevel) structuredContextParts.push(`Education: ${user.educationLevel}`);
    if (user?.institution) structuredContextParts.push(`Institution: ${user.institution}`);
    if (user?.major) structuredContextParts.push(`Major: ${user.major}`);
    if (courses.length > 0) {
      structuredContextParts.push(`Courses: ${courses.map(c => c.courseName).join(', ')}`);
    }
    if (skills.length > 0) {
      const skillsList = skills.map(s => `${s.name} (${s.category || 'General'}, ${s.level || 'beginner'})`).join(', ');
      structuredContextParts.push(`IMPORTANT - Existing Skills: ${skillsList}. If user wants to learn a skill that already exists, UPDATE it instead of creating a duplicate!`);
    }
    
    // Add recent plans context
    if (recentPlans.length > 0) {
      const planSummaries = recentPlans.map(plan => {
        const planDate = new Date(plan.date).toLocaleDateString();
        const schedule = (plan.planJson as any)?.schedule || [];
        const tasks = schedule.map((s: any) => s.title).filter(Boolean).slice(0, 5);
        return `Plan for ${planDate}: ${plan.summary || 'Daily schedule'} - Tasks: ${tasks.join(', ')}`;
      });
      structuredContextParts.push(`Recent Plans:\n${planSummaries.join('\n')}`);
    }

    // Add unstructured context from PostgreSQL (user-editable context)
    // This ensures the AI always has the latest unstructured context
    if (user?.unstructuredContext && user.unstructuredContext.trim()) {
      structuredContextParts.push(`\nUser Notes and Preferences:\n${user.unstructuredContext}`);
    }

    // Forward to AI service with structured context
    // The AI service will also retrieve additional context from ChromaDB
    const aiResp = await chatAI({
      user_id: userId,
      user_name: userName,
      message,
      conversation_history: conversation_history || [],
      structured_context: structuredContextParts.join('; ') // Pass as string for now
    });

    // Process actions returned by AI (e.g., update user data)
    const actionResults: any[] = [];
    console.log('AI response actions:', aiResp.actions ? `${aiResp.actions.length} actions received` : 'No actions');
    if (aiResp.actions && aiResp.actions.length > 0) {
      console.log('Processing actions:', JSON.stringify(aiResp.actions.map((a: any) => ({ type: a.type, hasData: !!a.data })), null, 2));
      for (const action of aiResp.actions) {
        try {
          console.log(`Processing action: ${action.type}`);
          if (action.type === 'update_user') {
            await prisma.user.update({
              where: { id: userId },
              data: action.data
            });
            console.log('User data updated via AI:', action.data);
            actionResults.push({ type: action.type, success: true });
          } else if (action.type === 'add_course') {
            await prisma.course.create({
              data: {
                userId,
                courseName: action.data.name || action.data.courseName,
                courseCode: action.data.code || action.data.courseCode || null,
                credits: action.data.credits || null
              }
            });
            console.log('Course added via AI:', action.data);
            actionResults.push({ type: action.type, success: true });
          } else if (action.type === 'add_skill') {
            console.log('Processing add_skill action:', JSON.stringify(action.data, null, 2));
            
            // Check if skill with same name already exists (prevent duplicates)
            const existingSkill = await prisma.skill.findFirst({
              where: {
                userId,
                name: {
                  equals: action.data.name,
                  mode: 'insensitive'
                }
              }
            });

            if (existingSkill) {
              console.log(`Skill "${action.data.name}" already exists, updating instead of creating duplicate`);
              // Update existing skill with new information
              const result = await prisma.$transaction(async (tx) => {
                // Update skill with all extended fields
                const updatedSkill = await tx.skill.update({
                  where: { id: existingSkill.id },
                  data: {
                    name: action.data.name,
                    category: action.data.category || existingSkill.category || 'General',
                    level: action.data.level || action.data.currentLevel || existingSkill.level || 'beginner',
                    description: action.data.description || existingSkill.description,
                    goalStatement: action.data.goalStatement || existingSkill.goalStatement,
                    durationMonths: action.data.durationMonths ? parseInt(action.data.durationMonths) : existingSkill.durationMonths,
                    estimatedHours: action.data.estimatedHours ? parseFloat(action.data.estimatedHours) : existingSkill.estimatedHours,
                    startDate: action.data.startDate ? new Date(action.data.startDate) : existingSkill.startDate,
                    endDate: action.data.endDate ? new Date(action.data.endDate) : existingSkill.endDate,
                    aiGenerated: true
                  }
                });

                // Delete existing milestones and create new ones if provided
                if (action.data.milestones && Array.isArray(action.data.milestones) && action.data.milestones.length > 0) {
                  await tx.milestone.deleteMany({ where: { skillId: existingSkill.id } });
                  await tx.milestone.createMany({
                    data: action.data.milestones.map((milestone: any, index: number) => ({
                      skillId: existingSkill.id,
                      userId,
                      name: milestone.name,
                      completed: milestone.completed || false,
                      order: milestone.order !== undefined ? milestone.order : index
                    }))
                  });
                }

                // Delete existing resources and create new ones if provided
                if (action.data.resources && Array.isArray(action.data.resources) && action.data.resources.length > 0) {
                  await tx.learningResource.deleteMany({ where: { skillId: existingSkill.id } });
                  await tx.learningResource.createMany({
                    data: action.data.resources.map((resource: any) => ({
                      skillId: existingSkill.id,
                      userId,
                      title: resource.title,
                      type: resource.type || 'link',
                      url: resource.url || null,
                      content: resource.content || null,
                      description: resource.description || null
                    }))
                  });
                  await tx.skill.update({
                    where: { id: existingSkill.id },
                    data: { resourceCount: action.data.resources.length }
                  });
                }

                return updatedSkill;
              }, { timeout: 30000 });

              console.log('Skill updated via AI (prevented duplicate):', action.data.name);
              actionResults.push({
                type: 'update_skill', // Return as update since we updated existing
                success: true,
                data: { skillId: result.id, skillName: result.name }
              });
            } else {
              // Create new skill (doesn't exist yet)
              // Use transaction for better performance and atomicity
              const result = await prisma.$transaction(async (tx) => {
              // Create skill with all extended fields
              const skill = await tx.skill.create({
                data: {
                  userId,
                  name: action.data.name,
                  category: action.data.category || 'General',
                  level: action.data.level || action.data.currentLevel || 'beginner',
                  description: action.data.description || null,
                  goalStatement: action.data.goalStatement || null,
                  durationMonths: action.data.durationMonths ? parseInt(action.data.durationMonths) : null,
                  estimatedHours: action.data.estimatedHours ? parseFloat(action.data.estimatedHours) : null,
                  startDate: action.data.startDate ? new Date(action.data.startDate) : null,
                  endDate: action.data.endDate ? new Date(action.data.endDate) : null,
                  aiGenerated: true,
                  gradient: 'from-blue-500 to-cyan-500',
                  progress: 0,
                  timeSpent: '0h',
                  resourceCount: action.data.resources?.length || 0
                }
              });

              // Create milestones if provided (batch create for better performance)
              if (action.data.milestones && Array.isArray(action.data.milestones) && action.data.milestones.length > 0) {
                await tx.milestone.createMany({
                  data: action.data.milestones.map((milestone: any, index: number) => ({
                    skillId: skill.id,
                    userId,
                    name: milestone.name,
                    completed: milestone.completed || false,
                    order: milestone.order !== undefined ? milestone.order : index
                  }))
                });
              }

              // Create learning resources if provided (batch create for better performance)
              if (action.data.resources && Array.isArray(action.data.resources) && action.data.resources.length > 0) {
                await tx.learningResource.createMany({
                  data: action.data.resources.map((resource: any) => ({
                    skillId: skill.id,
                    userId,
                    title: resource.title,
                    type: resource.type || 'link',
                    url: resource.url || null,
                    content: resource.content || null,
                    description: resource.description || null
                  }))
                });
              }

              return skill;
            }, {
              timeout: 30000 // 30 second timeout for transaction
            });

            console.log('Skill added via AI with milestones and resources:', action.data.name);
            actionResults.push({
              type: action.type,
              success: true,
              data: { skillId: result.id, skillName: result.name }
            });
            }
          } else if (action.type === 'update_skill') {
            // Find skill by ID or name
            let skill = null;
            if (action.data.skill_id) {
              skill = await prisma.skill.findUnique({ where: { id: action.data.skill_id } });
            } else if (action.data.skill_name) {
              skill = await prisma.skill.findFirst({
                where: { userId, name: { contains: action.data.skill_name, mode: 'insensitive' } }
              });
            }

            if (!skill || skill.userId !== userId) {
              console.error('Skill not found for update:', action.data);
              continue;
            }

            // Update only provided fields
            const updateData: any = {};
            if (action.data.name) updateData.name = action.data.name;
            if (action.data.category) updateData.category = action.data.category;
            if (action.data.level) updateData.level = action.data.level;
            if (action.data.description !== undefined) updateData.description = action.data.description;
            if (action.data.goalStatement !== undefined) updateData.goalStatement = action.data.goalStatement;
            if (action.data.durationMonths !== undefined) updateData.durationMonths = action.data.durationMonths ? parseInt(action.data.durationMonths) : null;
            if (action.data.estimatedHours !== undefined) updateData.estimatedHours = action.data.estimatedHours ? parseFloat(action.data.estimatedHours) : null;
            if (action.data.startDate !== undefined) updateData.startDate = action.data.startDate ? new Date(action.data.startDate) : null;
            if (action.data.endDate !== undefined) updateData.endDate = action.data.endDate ? new Date(action.data.endDate) : null;

            await prisma.skill.update({
              where: { id: skill.id },
              data: updateData
            });
            console.log('Skill updated via AI:', skill.name);
            actionResults.push({ type: action.type, success: true, data: { skillId: skill.id } });
          } else if (action.type === 'add_milestone') {
            // Find skill by ID or name
            let skill = null;
            if (action.data.skill_id) {
              skill = await prisma.skill.findUnique({ where: { id: action.data.skill_id } });
            } else if (action.data.skill_name) {
              skill = await prisma.skill.findFirst({
                where: { userId, name: { contains: action.data.skill_name, mode: 'insensitive' } }
              });
            }

            if (!skill || skill.userId !== userId) {
              console.error('Skill not found for milestone:', action.data);
              continue;
            }

            // Get current max order
            const maxOrder = await prisma.milestone.findFirst({
              where: { skillId: skill.id },
              orderBy: { order: 'desc' },
              select: { order: true }
            });

            await prisma.milestone.create({
              data: {
                skillId: skill.id,
                userId,
                name: action.data.name,
                completed: action.data.completed || false,
                order: action.data.order !== undefined ? action.data.order : (maxOrder ? maxOrder.order + 1 : 0)
              }
            });
            console.log('Milestone added via AI:', action.data.name);
            actionResults.push({ type: action.type, success: true, data: { skillId: skill.id } });
          } else if (action.type === 'add_resource') {
            // Find skill by ID or name
            let skill = null;
            if (action.data.skill_id) {
              skill = await prisma.skill.findUnique({ where: { id: action.data.skill_id } });
            } else if (action.data.skill_name) {
              skill = await prisma.skill.findFirst({
                where: { userId, name: { contains: action.data.skill_name, mode: 'insensitive' } }
              });
            }

            if (!skill || skill.userId !== userId) {
              console.error('Skill not found for resource:', action.data);
              continue;
            }

            await prisma.learningResource.create({
              data: {
                skillId: skill.id,
                userId,
                title: action.data.title,
                type: action.data.type || 'link',
                url: action.data.url || null,
                content: action.data.content || null,
                description: action.data.description || null
              }
            });

            // Update resource count
            const resourceCount = await prisma.learningResource.count({ where: { skillId: skill.id } });
            await prisma.skill.update({
              where: { id: skill.id },
              data: { resourceCount }
            });
            console.log('Resource added via AI:', action.data.title);
            actionResults.push({ type: action.type, success: true, data: { skillId: skill.id } });
          }
        } catch (error: any) {
          console.error(`Error processing action ${action.type}:`, error);
          console.error('Action data:', JSON.stringify(action.data, null, 2));
          console.error('Error stack:', error.stack);
          actionResults.push({
            type: action.type,
            success: false,
            error: error.message || 'Unknown error',
            errorDetails: error.stack
          });
          // Continue processing other actions even if one fails
        }
      }
    }

    res.json({ 
      success: true, 
      data: {
        ...aiResp,
        actionResults: actionResults.length > 0 ? actionResults : undefined
      }
    });
  } catch (error: any) {
    console.error('Chat error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to process chat message'
    });
  }
};

