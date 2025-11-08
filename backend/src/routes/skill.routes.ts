import express from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate, AuthRequest } from '../middleware/auth.middleware';
import { getSkillSuggestions, generateSkillRoadmap } from '../services/ai.service';

const router = express.Router();
const prisma = new PrismaClient();

// Apply auth middleware to all routes
router.use(authenticate);

// ===========================
// SKILLS ENDPOINTS
// ===========================

// Get all skills for user
router.get('/', async (req: AuthRequest, res) => {
  try {
    const skills = await prisma.skill.findMany({
      where: { userId: req.userId! },
      include: {
        milestones: {
          orderBy: { order: 'asc' }
        },
        learningResources: {
          orderBy: { createdAt: 'desc' }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
    res.json(skills);
  } catch (error) {
    console.error('Error fetching skills:', error);
    res.status(500).json({ error: 'Error fetching skills' });
  }
});

// Get single skill by ID
router.get('/:id', async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const skill = await prisma.skill.findUnique({
      where: { id },
      include: {
        milestones: {
          orderBy: { order: 'asc' }
        },
        learningResources: {
          orderBy: { createdAt: 'desc' }
        },
        aiRecommendations: true
      }
    });

    if (!skill || skill.userId !== req.userId) {
      return res.status(404).json({ error: 'Skill not found' });
    }

    res.json(skill);
  } catch (error) {
    console.error('Error fetching skill:', error);
    res.status(500).json({ error: 'Error fetching skill' });
  }
});

// Create new skill
router.post('/', async (req: AuthRequest, res) => {
  try {
    const { 
      name, 
      category, 
      level, 
      description, 
      gradient, 
      nextTask, 
      milestones,
      durationMonths,
      estimatedHours,
      startDate,
      endDate,
      goalStatement,
      aiGenerated
    } = req.body;

    const skill = await prisma.skill.create({
      data: {
        userId: req.userId!,
        name,
        category,
        level,
        description,
        gradient: gradient || 'from-blue-500 to-cyan-500',
        nextTask,
        progress: 0,
        timeSpent: '0h',
        resourceCount: 0,
        durationMonths: durationMonths ? parseInt(durationMonths) : null,
        estimatedHours: estimatedHours ? parseFloat(estimatedHours) : null,
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
        goalStatement: goalStatement || null,
        aiGenerated: aiGenerated || false
      }
    });

    // Create milestones if provided
    if (milestones && Array.isArray(milestones)) {
      await Promise.all(
        milestones.map((milestone: any, index: number) =>
          prisma.milestone.create({
            data: {
              skillId: skill.id,
              userId: req.userId!,
              name: milestone.name,
              completed: milestone.completed || false,
              status: milestone.status || (milestone.completed ? 'completed' : 'pending'),
              dueDate: milestone.dueDate ? new Date(milestone.dueDate) : null,
              order: index
            }
          })
        )
      );
    }

    // Fetch the complete skill with milestones
    const completeSkill = await prisma.skill.findUnique({
      where: { id: skill.id },
      include: {
        milestones: {
          orderBy: { order: 'asc' }
        }
      }
    });

    res.status(201).json(completeSkill);
  } catch (error) {
    console.error('Error creating skill:', error);
    res.status(500).json({ error: 'Error creating skill' });
  }
});

// Update skill
router.put('/:id', async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const existing = await prisma.skill.findUnique({ where: { id } });

    if (!existing || existing.userId !== req.userId) {
      return res.status(404).json({ error: 'Skill not found' });
    }

    const { 
      name, 
      category, 
      level, 
      description, 
      gradient, 
      nextTask, 
      timeSpent, 
      certificateUrl,
      durationMonths,
      estimatedHours,
      startDate,
      endDate,
      goalStatement
    } = req.body;

    const skill = await prisma.skill.update({
      where: { id },
      data: {
        name,
        category,
        level,
        description,
        gradient,
        nextTask,
        timeSpent,
        certificateUrl,
        durationMonths: durationMonths !== undefined ? (durationMonths ? parseInt(durationMonths) : null) : undefined,
        estimatedHours: estimatedHours !== undefined ? (estimatedHours ? parseFloat(estimatedHours) : null) : undefined,
        startDate: startDate !== undefined ? (startDate ? new Date(startDate) : null) : undefined,
        endDate: endDate !== undefined ? (endDate ? new Date(endDate) : null) : undefined,
        goalStatement: goalStatement !== undefined ? goalStatement : undefined
      },
      include: {
        milestones: {
          orderBy: { order: 'asc' }
        },
        learningResources: true
      }
    });

    res.json(skill);
  } catch (error) {
    console.error('Error updating skill:', error);
    res.status(500).json({ error: 'Error updating skill' });
  }
});

// Delete skill
router.delete('/:id', async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const existing = await prisma.skill.findUnique({ where: { id } });

    if (!existing || existing.userId !== req.userId) {
      return res.status(404).json({ error: 'Skill not found' });
    }

    await prisma.skill.delete({ where: { id } });
    res.json({ message: 'Skill deleted successfully' });
  } catch (error) {
    console.error('Error deleting skill:', error);
    res.status(500).json({ error: 'Error deleting skill' });
  }
});

// Get skill statistics
router.get('/:id/stats', async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const skill = await prisma.skill.findUnique({
      where: { id },
      include: {
        milestones: true,
        learningResources: true
      }
    });

    if (!skill || skill.userId !== req.userId) {
      return res.status(404).json({ error: 'Skill not found' });
    }

    const totalMilestones = skill.milestones.length;
    // Count completed milestones using status field (fallback to completed boolean for backward compatibility)
    const completedMilestones = skill.milestones.filter(m => 
      m.status === 'completed' || (m.status === null && m.completed)
    ).length;
    const progress = totalMilestones > 0 ? (completedMilestones / totalMilestones) * 100 : 0;

    res.json({
      totalMilestones,
      completedMilestones,
      progress,
      resourceCount: skill.learningResources.length,
      timeSpent: skill.timeSpent
    });
  } catch (error) {
    console.error('Error fetching skill stats:', error);
    res.status(500).json({ error: 'Error fetching skill statistics' });
  }
});

// ===========================
// MILESTONES ENDPOINTS
// ===========================

// Get milestones for a skill
router.get('/:skillId/milestones', async (req: AuthRequest, res) => {
  try {
    const { skillId } = req.params;
    const skill = await prisma.skill.findUnique({ where: { id: skillId } });

    if (!skill || skill.userId !== req.userId) {
      return res.status(404).json({ error: 'Skill not found' });
    }

    const milestones = await prisma.milestone.findMany({
      where: { skillId },
      orderBy: { order: 'asc' }
    });

    res.json(milestones);
  } catch (error) {
    console.error('Error fetching milestones:', error);
    res.status(500).json({ error: 'Error fetching milestones' });
  }
});

// Add milestone to skill
router.post('/:skillId/milestones', async (req: AuthRequest, res) => {
  try {
    const { skillId } = req.params;
    const { name, completed, status, dueDate, order } = req.body;

    const skill = await prisma.skill.findUnique({ where: { id: skillId } });
    if (!skill || skill.userId !== req.userId) {
      return res.status(404).json({ error: 'Skill not found' });
    }

    // Use status if provided, otherwise derive from completed boolean for backward compatibility
    const milestoneStatus = status || (completed ? 'completed' : 'pending');

    const milestone = await prisma.milestone.create({
      data: {
        skillId,
        userId: req.userId!,
        name,
        completed: completed || false, // Keep for backward compatibility
        status: milestoneStatus,
        dueDate: dueDate ? new Date(dueDate) : null,
        order: order || 0
      }
    });

    // Recalculate skill progress
    await updateSkillProgress(skillId);

    res.status(201).json(milestone);
  } catch (error) {
    console.error('Error creating milestone:', error);
    res.status(500).json({ error: 'Error creating milestone' });
  }
});

// Update milestone
router.put('/milestones/:id', async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const existing = await prisma.milestone.findUnique({ where: { id } });

    if (!existing || existing.userId !== req.userId) {
      return res.status(404).json({ error: 'Milestone not found' });
    }

    const { name, completed, status, dueDate, order } = req.body;

    // Build update data
    const updateData: any = { name, order };
    
    // Handle status - if status is provided, use it; otherwise derive from completed
    if (status !== undefined) {
      updateData.status = status;
      updateData.completed = status === 'completed'; // Keep completed in sync
    } else if (completed !== undefined) {
      updateData.completed = completed;
      updateData.status = completed ? 'completed' : 'pending'; // Derive status from completed
    }
    
    if (dueDate !== undefined) {
      updateData.dueDate = dueDate ? new Date(dueDate) : null;
    }

    const milestone = await prisma.milestone.update({
      where: { id },
      data: updateData
    });

    // Recalculate skill progress
    await updateSkillProgress(existing.skillId);

    res.json(milestone);
  } catch (error) {
    console.error('Error updating milestone:', error);
    res.status(500).json({ error: 'Error updating milestone' });
  }
});

// Toggle milestone status (cycles: pending → in-progress → completed → pending)
router.patch('/milestones/:id/toggle', async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const existing = await prisma.milestone.findUnique({ where: { id } });

    if (!existing || existing.userId !== req.userId) {
      return res.status(404).json({ error: 'Milestone not found' });
    }

    // Get current status (use status field if available, otherwise derive from completed)
    const currentStatus = existing.status || (existing.completed ? 'completed' : 'pending');
    
    // Cycle through: pending → in-progress → completed → pending
    let nextStatus: string;
    if (currentStatus === 'pending') {
      nextStatus = 'in-progress';
    } else if (currentStatus === 'in-progress') {
      nextStatus = 'completed';
    } else {
      nextStatus = 'pending'; // completed → pending
    }

    const milestone = await prisma.milestone.update({
      where: { id },
      data: { 
        status: nextStatus,
        completed: nextStatus === 'completed' // Keep completed in sync
      }
    });

    // Recalculate skill progress
    await updateSkillProgress(existing.skillId);

    // Get updated skill progress
    const skill = await prisma.skill.findUnique({
      where: { id: existing.skillId },
      select: { progress: true }
    });

    res.json({ milestone, skillProgress: skill?.progress });
  } catch (error) {
    console.error('Error toggling milestone:', error);
    res.status(500).json({ error: 'Error toggling milestone' });
  }
});

// Delete milestone
router.delete('/milestones/:id', async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const existing = await prisma.milestone.findUnique({ where: { id } });

    if (!existing || existing.userId !== req.userId) {
      return res.status(404).json({ error: 'Milestone not found' });
    }

    await prisma.milestone.delete({ where: { id } });

    // Recalculate skill progress
    await updateSkillProgress(existing.skillId);

    res.json({ message: 'Milestone deleted successfully' });
  } catch (error) {
    console.error('Error deleting milestone:', error);
    res.status(500).json({ error: 'Error deleting milestone' });
  }
});

// ===========================
// LEARNING RESOURCES ENDPOINTS
// ===========================

// Get resources for a skill
router.get('/:skillId/resources', async (req: AuthRequest, res) => {
  try {
    const { skillId } = req.params;
    const skill = await prisma.skill.findUnique({ where: { id: skillId } });

    if (!skill || skill.userId !== req.userId) {
      return res.status(404).json({ error: 'Skill not found' });
    }

    const resources = await prisma.learningResource.findMany({
      where: { skillId },
      orderBy: { createdAt: 'desc' }
    });

    res.json(resources);
  } catch (error) {
    console.error('Error fetching resources:', error);
    res.status(500).json({ error: 'Error fetching learning resources' });
  }
});

// Add learning resource
router.post('/:skillId/resources', async (req: AuthRequest, res) => {
  try {
    const { skillId } = req.params;
    const { title, type, url, content, description } = req.body;

    const skill = await prisma.skill.findUnique({ where: { id: skillId } });
    if (!skill || skill.userId !== req.userId) {
      return res.status(404).json({ error: 'Skill not found' });
    }

    const resource = await prisma.learningResource.create({
      data: {
        skillId,
        userId: req.userId!,
        title,
        type,
        url,
        content,
        description
      }
    });

    // Update resource count
    const resourceCount = await prisma.learningResource.count({ where: { skillId } });
    await prisma.skill.update({
      where: { id: skillId },
      data: { resourceCount }
    });

    res.status(201).json(resource);
  } catch (error) {
    console.error('Error creating resource:', error);
    res.status(500).json({ error: 'Error creating learning resource' });
  }
});

// Update learning resource
router.put('/resources/:id', async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const existing = await prisma.learningResource.findUnique({ where: { id } });

    if (!existing || existing.userId !== req.userId) {
      return res.status(404).json({ error: 'Resource not found' });
    }

    const { title, type, url, content, description } = req.body;

    const resource = await prisma.learningResource.update({
      where: { id },
      data: { title, type, url, content, description }
    });

    res.json(resource);
  } catch (error) {
    console.error('Error updating resource:', error);
    res.status(500).json({ error: 'Error updating learning resource' });
  }
});

// Delete learning resource
router.delete('/resources/:id', async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const existing = await prisma.learningResource.findUnique({ where: { id } });

    if (!existing || existing.userId !== req.userId) {
      return res.status(404).json({ error: 'Resource not found' });
    }

    await prisma.learningResource.delete({ where: { id } });

    // Update resource count
    const resourceCount = await prisma.learningResource.count({ where: { skillId: existing.skillId } });
    await prisma.skill.update({
      where: { id: existing.skillId },
      data: { resourceCount }
    });

    res.json({ message: 'Learning resource deleted successfully' });
  } catch (error) {
    console.error('Error deleting resource:', error);
    res.status(500).json({ error: 'Error deleting learning resource' });
  }
});

// ===========================
// AI RECOMMENDATIONS ENDPOINTS
// ===========================

// Get AI recommendations for user
router.get('/recommendations/all', async (req: AuthRequest, res) => {
  try {
    const recommendations = await prisma.aIRecommendation.findMany({
      where: { userId: req.userId!, completed: false },
      include: {
        skill: {
          select: { name: true }
        }
      },
      orderBy: [
        { priority: 'desc' },
        { createdAt: 'desc' }
      ]
    });

    res.json(recommendations);
  } catch (error) {
    console.error('Error fetching recommendations:', error);
    res.status(500).json({ error: 'Error fetching AI recommendations' });
  }
});

// Generate AI recommendations (mock - will be replaced with LangChain)
router.post('/recommendations/generate', async (req: AuthRequest, res) => {
  try {
    // Mock AI recommendations based on user's skills
    const skills = await prisma.skill.findMany({
      where: { userId: req.userId! },
      include: { milestones: true }
    });

    const recommendations = [];

    for (const skill of skills) {
      // Find incomplete milestones
      const incompleteMilestones = skill.milestones.filter(m => !m.completed);
      
      if (incompleteMilestones.length > 0 && skill.progress < 100) {
        const nextMilestone = incompleteMilestones[0];
        
        // Create recommendation for next milestone
        const priority = skill.progress > 50 ? 'high' : skill.progress > 25 ? 'medium' : 'low';
        
        recommendations.push({
          userId: req.userId!,
          skillId: skill.id,
          title: `Complete: ${nextMilestone.name}`,
          priority,
          estimatedTime: '2-3 hours',
          reason: `You're ${skill.progress.toFixed(0)}% through ${skill.name}. This is the next logical step.`
        });
      }
    }

    // Create recommendations in database
    const created = await Promise.all(
      recommendations.slice(0, 3).map(rec =>
        prisma.aIRecommendation.create({ data: rec })
      )
    );

    res.json(created);
  } catch (error) {
    console.error('Error generating recommendations:', error);
    res.status(500).json({ error: 'Error generating AI recommendations' });
  }
});

// Mark recommendation as completed
router.patch('/recommendations/:id/complete', async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const existing = await prisma.aIRecommendation.findUnique({ where: { id } });

    if (!existing || existing.userId !== req.userId) {
      return res.status(404).json({ error: 'Recommendation not found' });
    }

    const recommendation = await prisma.aIRecommendation.update({
      where: { id },
      data: { completed: true }
    });

    res.json(recommendation);
  } catch (error) {
    console.error('Error completing recommendation:', error);
    res.status(500).json({ error: 'Error completing recommendation' });
  }
});

// Delete recommendation
router.delete('/recommendations/:id', async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const existing = await prisma.aIRecommendation.findUnique({ where: { id } });

    if (!existing || existing.userId !== req.userId) {
      return res.status(404).json({ error: 'Recommendation not found' });
    }

    await prisma.aIRecommendation.delete({ where: { id } });
    res.json({ message: 'Recommendation deleted successfully' });
  } catch (error) {
    console.error('Error deleting recommendation:', error);
    res.status(500).json({ error: 'Error deleting recommendation' });
  }
});

// ===========================
// AI GENERATION ENDPOINT (Future)
// ===========================

// AI-powered skill generation endpoint
// This endpoint accepts the same structured payload as manual creation
// Future AI microservice will POST to this endpoint with generated skill data
router.post('/ai-generate', async (req: AuthRequest, res) => {
  try {
    const { 
      name, 
      category, 
      level, 
      description, 
      gradient, 
      nextTask, 
      milestones,
      learningResources,
      durationMonths,
      estimatedHours,
      startDate,
      endDate,
      goalStatement
    } = req.body;

    // Create skill with aiGenerated flag set to true
    const skill = await prisma.skill.create({
      data: {
        userId: req.userId!,
        name,
        category,
        level,
        description,
        gradient: gradient || 'from-violet-500 to-purple-500',
        nextTask,
        progress: 0,
        timeSpent: '0h',
        resourceCount: 0,
        durationMonths: durationMonths ? parseInt(durationMonths) : null,
        estimatedHours: estimatedHours ? parseFloat(estimatedHours) : null,
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
        goalStatement: goalStatement || null,
        aiGenerated: true // Mark as AI-generated
      }
    });

    // Create milestones if provided
    if (milestones && Array.isArray(milestones)) {
      await Promise.all(
        milestones.map((milestone: any, index: number) =>
          prisma.milestone.create({
            data: {
              skillId: skill.id,
              userId: req.userId!,
              name: milestone.name,
              completed: milestone.completed || false,
              status: milestone.status || (milestone.completed ? 'completed' : 'pending'),
              dueDate: milestone.dueDate ? new Date(milestone.dueDate) : null,
              order: index
            }
          })
        )
      );
    }

    // Create learning resources if provided
    if (learningResources && Array.isArray(learningResources)) {
      await Promise.all(
        learningResources.map((resource: any) =>
          prisma.learningResource.create({
            data: {
              skillId: skill.id,
              userId: req.userId!,
              title: resource.title,
              type: resource.type,
              url: resource.url,
              content: resource.content,
              description: resource.description
            }
          })
        )
      );

      // Update resource count
      await prisma.skill.update({
        where: { id: skill.id },
        data: { resourceCount: learningResources.length }
      });
    }

    // Fetch the complete skill with relations
    const completeSkill = await prisma.skill.findUnique({
      where: { id: skill.id },
      include: {
        milestones: {
          orderBy: { order: 'asc' }
        },
        learningResources: {
          orderBy: { createdAt: 'desc' }
        }
      }
    });

    res.status(201).json(completeSkill);
  } catch (error) {
    console.error('Error generating AI skill:', error);
    res.status(500).json({ error: 'Error generating AI skill' });
  }
});

// ===========================
// AI SKILL GENERATION ENDPOINTS
// ===========================

// Get AI-generated skill suggestions
router.get('/generate/suggestions', async (req: AuthRequest, res) => {
  try {
    const userId = req.userId!;
    
    // Get user data for context
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        educationLevel: true,
        major: true,
        unstructuredContext: true
      }
    });

    // Get courses
    const courses = await prisma.course.findMany({
      where: { userId },
      select: { courseName: true },
      take: 10
    });

    // Get existing skills
    const existingSkills = await prisma.skill.findMany({
      where: { userId },
      select: { name: true, category: true, level: true },
      take: 10
    });

    // Call AI service
    const suggestions = await getSkillSuggestions({
      user_id: userId,
      courses: courses.map(c => ({ courseName: c.courseName })),
      existing_skills: existingSkills,
      education_level: user?.educationLevel || undefined,
      major: user?.major || undefined,
      unstructured_context: user?.unstructuredContext || undefined
    });

    res.json(suggestions);
  } catch (error) {
    console.error('Error generating skill suggestions:', error);
    res.status(500).json({ error: 'Error generating skill suggestions' });
  }
});

// Generate complete skill roadmap
router.post('/generate/roadmap', async (req: AuthRequest, res) => {
  try {
    const userId = req.userId!;
    const { skillName } = req.body;

    if (!skillName) {
      return res.status(400).json({ error: 'skillName is required' });
    }

    // Get user data for context
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        educationLevel: true,
        major: true,
        unstructuredContext: true
      }
    });

    // Get courses
    const courses = await prisma.course.findMany({
      where: { userId },
      select: { courseName: true },
      take: 10
    });

    // Get existing skills
    const existingSkills = await prisma.skill.findMany({
      where: { userId },
      select: { name: true, category: true, level: true },
      take: 10
    });

    // Call AI service
    const roadmap = await generateSkillRoadmap({
      user_id: userId,
      skill_name: skillName,
      courses: courses.map(c => ({ courseName: c.courseName })),
      existing_skills: existingSkills,
      education_level: user?.educationLevel || undefined,
      major: user?.major || undefined,
      unstructured_context: user?.unstructuredContext || undefined
    });

    res.json(roadmap);
  } catch (error) {
    console.error('Error generating skill roadmap:', error);
    res.status(500).json({ error: 'Error generating skill roadmap' });
  }
});

// ===========================
// HELPER FUNCTIONS
// ===========================

async function updateSkillProgress(skillId: string) {
  const milestones = await prisma.milestone.findMany({ where: { skillId } });
  const totalMilestones = milestones.length;
  // Count completed milestones using status field (fallback to completed boolean for backward compatibility)
  const completedMilestones = milestones.filter(m => 
    m.status === 'completed' || (m.status === null && m.completed)
  ).length;
  const progress = totalMilestones > 0 ? (completedMilestones / totalMilestones) * 100 : 0;

  await prisma.skill.update({
    where: { id: skillId },
    data: { progress }
  });
}

export default router;
