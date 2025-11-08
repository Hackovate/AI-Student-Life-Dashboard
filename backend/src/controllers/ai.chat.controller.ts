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
        class: true,
        year: true,
        group: true,
        unstructuredContext: true
      }
    });

    const userName = user 
      ? `${user.firstName || ''} ${user.lastName || ''}`.trim()
      : undefined;

    // Get structured context summary for AI
    let courses: any[] = [];
    let skills: any[] = [];
    let recentFinances: any[] = [];
    let allFinances: any[] = [];
    let monthlyIncome = 0;
    let monthlyExpenses = 0;
    let savingsGoals: any[] = [];
    let recentJournals: any[] = [];
    let recentLifestyle: any[] = [];
    let habits: any[] = [];

    try {
      courses = await prisma.course.findMany({
        where: { userId },
        include: {
          classSchedule: true,
          assignments: {
            orderBy: { dueDate: 'asc' },
            take: 10
          },
          exams: {
            orderBy: { date: 'asc' },
            take: 10
          },
          attendanceRecords: {
            orderBy: { date: 'desc' },
            take: 20
          }
        },
        take: 20
      });

      skills = await prisma.skill.findMany({
        where: { userId },
        select: { name: true, category: true, level: true }
      });

      // Get finance data (recent transactions, monthly totals, savings goals)
      recentFinances = await prisma.finance.findMany({
        where: { userId },
        orderBy: { date: 'desc' },
        take: 15,
        select: {
          id: true,
          type: true,
          amount: true,
          category: true,
          description: true,
          date: true
        }
      });

      allFinances = await prisma.finance.findMany({
        where: { userId },
        select: { type: true, amount: true }
      });

      monthlyIncome = allFinances
        .filter(f => f.type === 'income')
        .reduce((sum, f) => sum + (f.amount || 0), 0);
      monthlyExpenses = allFinances
        .filter(f => f.type === 'expense')
        .reduce((sum, f) => sum + (f.amount || 0), 0);

      savingsGoals = await prisma.savingsGoal.findMany({
        where: { userId, status: 'active' },
        select: { title: true, targetAmount: true, currentAmount: true, dueDate: true }
      });

      // Get journal entries (recent with mood trends)
      recentJournals = await prisma.journal.findMany({
        where: { userId },
        orderBy: { date: 'desc' },
        take: 7,
        select: {
          title: true,
          mood: true,
          tags: true,
          date: true
        }
      });

      // Get lifestyle data (recent records)
      recentLifestyle = await prisma.lifestyle.findMany({
        where: { userId },
        orderBy: { date: 'desc' },
        take: 7,
        select: {
          date: true,
          sleepHours: true,
          exerciseMinutes: true,
          stressLevel: true,
          mealQuality: true
        }
      });

      // Get habits with completion status
      habits = await prisma.habit.findMany({
        where: { userId },
        select: {
          id: true,
          name: true,
          target: true,
          time: true,
          streak: true,
          completed: true,
          completionHistory: true
        }
      });
    } catch (contextError: any) {
      console.error('Error fetching context data:', contextError);
      // Continue with empty arrays - don't fail the entire request
    }

    // Get recent daily plans (last 7 days)
    let recentPlans: any[] = [];
    try {
      recentPlans = await prisma.aIPlan.findMany({
        where: { userId },
        orderBy: { date: 'desc' },
        take: 3,
        select: {
          date: true,
          summary: true,
          planJson: true
        }
      });
    } catch (planError: any) {
      console.error('Error fetching recent plans:', planError);
      // Continue with empty array
    }

    // Build structured context summary
    const structuredContextParts: string[] = [];
    if (user?.educationLevel) {
      let educationInfo = `Education: ${user.educationLevel}`;
      if (user.educationLevel === 'school' && user.class) {
        educationInfo += `, Class: ${user.class}`;
      }
      if ((user.educationLevel === 'college' || user.educationLevel === 'university') && user.year) {
        educationInfo += `, Year: ${user.year}`;
      }
      if ((user.educationLevel === 'school' || user.educationLevel === 'college') && user.group) {
        educationInfo += `, Group: ${user.group}`;
      }
      structuredContextParts.push(educationInfo);
    }
    if (user?.institution) structuredContextParts.push(`Institution: ${user.institution}`);
    if (user?.major) structuredContextParts.push(`Major: ${user.major}`);
    if (courses.length > 0) {
      const coursesList = courses.map(c => {
        const courseInfo = [`${c.courseName}${c.courseCode ? ` (${c.courseCode})` : ''}`];
        if (c.attendance !== null) courseInfo.push(`Attendance: ${c.attendance.toFixed(1)}%`);
        if (c.progress !== null) courseInfo.push(`Progress: ${c.progress}%`);
        if (c.status) courseInfo.push(`Status: ${c.status}`);
        if (c.classSchedule.length > 0) {
          const schedules = c.classSchedule.map((s: any) => `${s.day} ${s.time}${s.type ? ` (${s.type})` : ''}`).join(', ');
          courseInfo.push(`Schedule: ${schedules}`);
        }
        if (c.assignments.length > 0) {
          const pendingAssignments = c.assignments.filter((a: any) => a.status === 'pending' || a.status === 'in_progress');
          if (pendingAssignments.length > 0) {
            courseInfo.push(`Pending Assignments: ${pendingAssignments.map((a: any) => a.title).join(', ')}`);
          }
        }
        if (c.exams.length > 0) {
          const upcomingExams = c.exams.filter((e: any) => new Date(e.date) >= new Date());
          if (upcomingExams.length > 0) {
            courseInfo.push(`Upcoming Exams: ${upcomingExams.map((e: any) => e.title || 'Exam').join(', ')}`);
          }
        }
        // Add attendance records and statistics
        if (c.attendanceRecords && c.attendanceRecords.length > 0) {
          const records = c.attendanceRecords;
          const totalClasses = records.length;
          const presentCount = records.filter((r: any) => r.status === 'present').length;
          const absentCount = records.filter((r: any) => r.status === 'absent').length;
          const lateCount = records.filter((r: any) => r.status === 'late').length;
          
          // Add attendance statistics
          courseInfo.push(`Attendance Stats: Total ${totalClasses} classes, Present ${presentCount}, Absent ${absentCount}, Late ${lateCount}`);
          
          // Add recent attendance records (last 10 with dates and status)
          const recentRecords = records.slice(0, 10).map((r: any) => {
            const date = new Date(r.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
            return `${date}: ${r.status}`;
          }).join(', ');
          if (recentRecords) {
            courseInfo.push(`Recent Attendance: ${recentRecords}`);
          }
        }
        return courseInfo.join(' | ');
      }).join('\n');
      structuredContextParts.push(`Courses/Subjects:\n${coursesList}`);
    }
    if (skills.length > 0) {
      const skillsList = skills.map(s => `${s.name} (${s.category || 'General'}, ${s.level || 'beginner'})`).join(', ');
      structuredContextParts.push(`IMPORTANT - Existing Skills: ${skillsList}. If user wants to learn a skill that already exists, UPDATE it instead of creating a duplicate!`);
    }

    // Add finance context
    if (recentFinances.length > 0) {
      const financeSummary = recentFinances.slice(0, 10).map(f => 
        `[ID: ${f.id}] ${f.type}: ${f.amount} ${f.category} - ${f.description || 'No description'}`
      ).join(', ');
      structuredContextParts.push(`Recent Finances: ${financeSummary}`);
    }
    if (monthlyIncome > 0 || monthlyExpenses > 0) {
      structuredContextParts.push(`Monthly Summary: Income ${monthlyIncome.toFixed(2)}, Expenses ${monthlyExpenses.toFixed(2)}, Balance ${(monthlyIncome - monthlyExpenses).toFixed(2)}`);
    }
    if (savingsGoals.length > 0) {
      const goalsList = savingsGoals.map(g => 
        `${g.title}: ${g.currentAmount}/${g.targetAmount} (${g.dueDate ? new Date(g.dueDate).toLocaleDateString() : 'No deadline'})`
      ).join(', ');
      structuredContextParts.push(`Active Savings Goals: ${goalsList}`);
    }

    // Add journal/lifestyle context
    if (recentJournals.length > 0) {
      const moodCounts: Record<string, number> = {};
      recentJournals.forEach(j => {
        if (j.mood) {
          moodCounts[j.mood] = (moodCounts[j.mood] || 0) + 1;
        }
      });
      const moodSummary = Object.entries(moodCounts).map(([mood, count]) => `${mood}: ${count}`).join(', ');
      structuredContextParts.push(`Recent Journal Entries: ${recentJournals.length} entries. Mood trends: ${moodSummary || 'No mood data'}`);
    }
    if (recentLifestyle.length > 0) {
      const sleepRecords = recentLifestyle.filter(l => l.sleepHours != null);
      const exerciseRecords = recentLifestyle.filter(l => l.exerciseMinutes != null);
      const stressRecords = recentLifestyle.filter(l => l.stressLevel != null);
      
      const avgSleep = sleepRecords.length > 0 
        ? sleepRecords.reduce((sum, l) => sum + (l.sleepHours || 0), 0) / sleepRecords.length 
        : 0;
      const avgExercise = exerciseRecords.length > 0 
        ? exerciseRecords.reduce((sum, l) => sum + (l.exerciseMinutes || 0), 0) / exerciseRecords.length 
        : 0;
      const avgStress = stressRecords.length > 0 
        ? stressRecords.reduce((sum, l) => sum + (l.stressLevel || 0), 0) / stressRecords.length 
        : 0;
      
      if (avgSleep > 0 || avgExercise > 0 || avgStress > 0) {
        structuredContextParts.push(`Lifestyle Patterns (last 7 days): Avg Sleep ${avgSleep.toFixed(1)}h, Avg Exercise ${avgExercise.toFixed(0)}min, Avg Stress ${avgStress.toFixed(1)}/10`);
      }
    }

    // Add habits context
    if (habits.length > 0) {
      const habitsList = habits.map(h => {
        const completionRate = h.completionHistory && Array.isArray(h.completionHistory) 
          ? (h.completionHistory as any[]).filter((entry: any) => entry.completed).length 
          : 0;
        return `${h.name} (${h.target}, streak: ${h.streak}, completed today: ${h.completed})`;
      }).join(', ');
      structuredContextParts.push(`Current Habits: ${habitsList}`);
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
    // Use '\n\n' for better separation and readability instead of '; '
    let aiResp;
    try {
      aiResp = await chatAI({
        user_id: userId,
        user_name: userName,
        message,
        conversation_history: conversation_history || [],
        structured_context: structuredContextParts.join('\n\n') // Better formatting with line breaks
      });
    } catch (aiError: any) {
      console.error('Error calling AI service:', aiError);
      console.error('AI service error details:', {
        message: aiError.message,
        response: aiError.response?.data,
        status: aiError.response?.status,
        code: aiError.code
      });
      throw new Error(`AI service error: ${aiError.message || 'Failed to get AI response'}`);
    }

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
            // Determine if this is a school/college subject or university course
            const isSchoolOrCollege = user?.educationLevel === 'school' || user?.educationLevel === 'college';
            
            if (isSchoolOrCollege) {
              // For school/college: subject name and group (stored in description)
              await prisma.course.create({
                data: {
                  userId,
                  courseName: action.data.name || action.data.courseName,
                  courseCode: null,
                  description: action.data.group || action.data.description || 'Subject',
                  credits: null,
                  semester: null,
                  year: null,
                  status: 'ongoing',
                  progress: 0,
                  attendance: 0,
                }
              });
            } else {
              // For university: full course details
              await prisma.course.create({
                data: {
                  userId,
                  courseName: action.data.name || action.data.courseName,
                  courseCode: action.data.code || action.data.courseCode || null,
                  description: action.data.description || null,
                  credits: action.data.credits ? parseInt(action.data.credits.toString()) : (action.data.credits === 0 ? 0 : 3),
                  semester: action.data.semester ? action.data.semester.toString() : null,
                  year: action.data.year ? parseInt(action.data.year.toString()) : null,
                  status: action.data.status || 'ongoing',
                  progress: action.data.progress !== undefined ? parseInt(action.data.progress.toString()) : 0,
                  attendance: action.data.attendance !== undefined ? parseFloat(action.data.attendance.toString()) : 0,
                }
              });
            }
            console.log('Course added via AI:', action.data);
            actionResults.push({ type: action.type, success: true });
          } else if (action.type === 'add_schedule') {
            // Find course by name or ID
            let course;
            if (action.data.courseId) {
              course = await prisma.course.findFirst({
                where: { id: action.data.courseId, userId }
              });
            } else if (action.data.courseName) {
              course = await prisma.course.findFirst({
                where: { 
                  courseName: { contains: action.data.courseName, mode: 'insensitive' },
                  userId 
                }
              });
            }
            if (!course) {
              throw new Error(`Course not found: ${action.data.courseName || action.data.courseId}`);
            }
            const schedule = await prisma.classSchedule.create({
              data: {
                courseId: course.id,
                day: action.data.day,
                time: action.data.time,
                type: action.data.type || null,
                location: action.data.location || null,
              }
            });
            console.log('Schedule added via AI:', schedule);
            actionResults.push({ type: action.type, success: true, data: schedule });
          } else if (action.type === 'update_schedule') {
            const existing = await prisma.classSchedule.findUnique({ where: { id: action.data.schedule_id } });
            if (!existing) throw new Error('Schedule not found');
            const course = await prisma.course.findUnique({ where: { id: existing.courseId } });
            if (!course || course.userId !== userId) throw new Error('Not authorized');
            const updated = await prisma.classSchedule.update({
              where: { id: action.data.schedule_id },
              data: {
                day: action.data.day,
                time: action.data.time,
                type: action.data.type,
                location: action.data.location,
              }
            });
            console.log('Schedule updated via AI:', updated);
            actionResults.push({ type: action.type, success: true, data: updated });
          } else if (action.type === 'delete_schedule') {
            const existing = await prisma.classSchedule.findUnique({ where: { id: action.data.schedule_id } });
            if (!existing) throw new Error('Schedule not found');
            const course = await prisma.course.findUnique({ where: { id: existing.courseId } });
            if (!course || course.userId !== userId) throw new Error('Not authorized');
            await prisma.classSchedule.delete({ where: { id: action.data.schedule_id } });
            console.log('Schedule deleted via AI:', action.data.schedule_id);
            actionResults.push({ type: action.type, success: true });
          } else if (action.type === 'mark_attendance') {
            // Find course by name or ID
            let course;
            if (action.data.courseId) {
              course = await prisma.course.findFirst({
                where: { id: action.data.courseId, userId },
                include: { classSchedule: true }
              });
            } else if (action.data.courseName) {
              course = await prisma.course.findFirst({
                where: { 
                  courseName: { contains: action.data.courseName, mode: 'insensitive' },
                  userId 
                },
                include: { classSchedule: true }
              });
            }
            if (!course) {
              throw new Error(`Course not found: ${action.data.courseName || action.data.courseId}`);
            }
            // Find schedule by ID or by day/time
            let scheduleId = action.data.classScheduleId;
            if (!scheduleId && (action.data.day || action.data.time)) {
              const schedule = course.classSchedule.find((s: any) => {
                const dayMatch = !action.data.day || s.day.toLowerCase().includes(action.data.day.toLowerCase());
                const timeMatch = !action.data.time || s.time === action.data.time;
                return dayMatch && timeMatch;
              });
              if (schedule) {
                scheduleId = schedule.id;
              } else {
                throw new Error(`Schedule not found for ${action.data.day || ''} ${action.data.time || ''}`);
              }
            }
            if (!scheduleId) {
              throw new Error('classScheduleId, day, or time is required');
            }
            const attendanceDate = action.data.date ? new Date(action.data.date) : new Date();
            attendanceDate.setHours(0, 0, 0, 0);
            const existing = await prisma.attendanceRecord.findFirst({
              where: {
                classScheduleId: scheduleId,
                userId,
                date: attendanceDate
              }
            });
            let record;
            if (existing) {
              record = await prisma.attendanceRecord.update({
                where: { id: existing.id },
                data: { status: action.data.status, notes: action.data.notes || null }
              });
            } else {
              record = await prisma.attendanceRecord.create({
                data: {
                  courseId: course.id,
                  classScheduleId: scheduleId,
                  userId,
                  date: attendanceDate,
                  status: action.data.status,
                  notes: action.data.notes || null
                }
              });
            }
            // Recalculate attendance percentage
            const allRecords = await prisma.attendanceRecord.findMany({
              where: { courseId: course.id, userId }
            });
            const totalClasses = allRecords.length;
            const presentClasses = allRecords.filter((r: any) => r.status === 'present' || r.status === 'late').length;
            const attendancePercentage = totalClasses > 0 ? (presentClasses / totalClasses) * 100 : 0;
            await prisma.course.update({
              where: { id: course.id },
              data: { attendance: attendancePercentage }
            });
            console.log('Attendance marked via AI:', record);
            actionResults.push({ type: action.type, success: true, data: { record, attendancePercentage } });
          } else if (action.type === 'update_attendance') {
            const existing = await prisma.attendanceRecord.findUnique({ where: { id: action.data.attendance_id } });
            if (!existing || existing.userId !== userId) throw new Error('Attendance record not found');
            const record = await prisma.attendanceRecord.update({
              where: { id: action.data.attendance_id },
              data: { status: action.data.status, notes: action.data.notes || null }
            });
            // Recalculate attendance percentage
            const allRecords = await prisma.attendanceRecord.findMany({
              where: { courseId: record.courseId, userId }
            });
            const totalClasses = allRecords.length;
            const presentClasses = allRecords.filter((r: any) => r.status === 'present' || r.status === 'late').length;
            const attendancePercentage = totalClasses > 0 ? (presentClasses / totalClasses) * 100 : 0;
            await prisma.course.update({
              where: { id: record.courseId },
              data: { attendance: attendancePercentage }
            });
            console.log('Attendance updated via AI:', record);
            actionResults.push({ type: action.type, success: true, data: { record, attendancePercentage } });
          } else if (action.type === 'delete_attendance') {
            const existing = await prisma.attendanceRecord.findUnique({ where: { id: action.data.attendance_id } });
            if (!existing || existing.userId !== userId) throw new Error('Attendance record not found');
            const courseId = existing.courseId;
            await prisma.attendanceRecord.delete({ where: { id: action.data.attendance_id } });
            // Recalculate attendance percentage
            const allRecords = await prisma.attendanceRecord.findMany({
              where: { courseId, userId }
            });
            const totalClasses = allRecords.length;
            const presentClasses = allRecords.filter((r: any) => r.status === 'present' || r.status === 'late').length;
            const attendancePercentage = totalClasses > 0 ? (presentClasses / totalClasses) * 100 : 0;
            await prisma.course.update({
              where: { id: courseId },
              data: { attendance: attendancePercentage }
            });
            console.log('Attendance deleted via AI:', action.data.attendance_id);
            actionResults.push({ type: action.type, success: true, data: { attendancePercentage } });
          } else if (action.type === 'add_assignment') {
            // Find course by name or ID
            let course;
            if (action.data.courseId) {
              course = await prisma.course.findFirst({
                where: { id: action.data.courseId, userId }
              });
            } else if (action.data.courseName) {
              course = await prisma.course.findFirst({
                where: { 
                  courseName: { contains: action.data.courseName, mode: 'insensitive' },
                  userId 
                }
              });
            }
            if (!course) {
              throw new Error(`Course not found: ${action.data.courseName || action.data.courseId}`);
            }
            
            // Find exam if examId is provided or try to match by course and date
            let examId = action.data.examId || null;
            if (!examId && action.data.dueDate) {
              // Try to find exam for this course around the due date (within 7 days)
              const dueDate = new Date(action.data.dueDate);
              const exam = await prisma.exam.findFirst({
                where: {
                  courseId: course.id,
                  date: {
                    gte: new Date(dueDate.getTime() - 7 * 24 * 60 * 60 * 1000), // 7 days before
                    lte: new Date(dueDate.getTime() + 7 * 24 * 60 * 60 * 1000)  // 7 days after
                  }
                },
                orderBy: { date: 'asc' }
              });
              if (exam) {
                examId = exam.id;
              }
            }
            
            // Mark as AI-generated if this is from AI chat (which it always is when coming from this controller)
            const assignment = await prisma.assignment.create({
              data: {
                courseId: course.id,
                title: action.data.title,
                description: action.data.description || null,
                dueDate: action.data.dueDate ? new Date(action.data.dueDate) : null,
                startDate: action.data.startDate ? new Date(action.data.startDate) : null,
                estimatedHours: action.data.estimatedHours ? parseFloat(action.data.estimatedHours.toString()) : null,
                status: action.data.status || 'pending',
                points: action.data.points ? parseInt(action.data.points.toString()) : null,
                aiGenerated: true, // All assignments from AI chat are AI-generated
                examId: examId,
              }
            });
            console.log('Assignment added via AI:', assignment);
            actionResults.push({ type: action.type, success: true, data: assignment });
          } else if (action.type === 'update_assignment') {
            const existing = await prisma.assignment.findUnique({ where: { id: action.data.assignment_id } });
            if (!existing) throw new Error('Assignment not found');
            const course = await prisma.course.findUnique({ where: { id: existing.courseId } });
            if (!course || course.userId !== userId) throw new Error('Not authorized');
            const updateData: any = {};
            if (action.data.title !== undefined) updateData.title = action.data.title;
            if (action.data.description !== undefined) updateData.description = action.data.description;
            if (action.data.dueDate !== undefined) updateData.dueDate = action.data.dueDate ? new Date(action.data.dueDate) : null;
            if (action.data.startDate !== undefined) updateData.startDate = action.data.startDate ? new Date(action.data.startDate) : null;
            if (action.data.estimatedHours !== undefined) updateData.estimatedHours = action.data.estimatedHours ? parseFloat(action.data.estimatedHours.toString()) : null;
            if (action.data.status !== undefined) updateData.status = action.data.status;
            if (action.data.points !== undefined) updateData.points = action.data.points ? parseInt(action.data.points.toString()) : null;
            const updated = await prisma.assignment.update({
              where: { id: action.data.assignment_id },
              data: updateData
            });
            console.log('Assignment updated via AI:', updated);
            actionResults.push({ type: action.type, success: true, data: updated });
          } else if (action.type === 'delete_assignment') {
            const existing = await prisma.assignment.findUnique({ where: { id: action.data.assignment_id } });
            if (!existing) throw new Error('Assignment not found');
            const course = await prisma.course.findUnique({ where: { id: existing.courseId } });
            if (!course || course.userId !== userId) throw new Error('Not authorized');
            await prisma.assignment.delete({ where: { id: action.data.assignment_id } });
            console.log('Assignment deleted via AI:', action.data.assignment_id);
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
          } else if (action.type === 'add_expense') {
            console.log('Processing add_expense action:', JSON.stringify(action.data, null, 2));
            const finance = await prisma.finance.create({
              data: {
                userId,
                type: 'expense',
                amount: parseFloat(action.data.amount),
                category: action.data.category || 'Other',
                description: action.data.description || null,
                date: action.data.date ? new Date(action.data.date) : new Date(),
                paymentMethod: action.data.paymentMethod || null,
                recurring: action.data.recurring || false,
                frequency: action.data.frequency || null,
                aiGenerated: true
              }
            });
            console.log('Expense added via AI:', action.data.description || action.data.category);
            actionResults.push({ type: action.type, success: true, data: { financeId: finance.id } });
          } else if (action.type === 'add_income') {
            console.log('Processing add_income action:', JSON.stringify(action.data, null, 2));
            const finance = await prisma.finance.create({
              data: {
                userId,
                type: 'income',
                amount: parseFloat(action.data.amount),
                category: action.data.category || 'Other',
                description: action.data.description || null,
                date: action.data.date ? new Date(action.data.date) : new Date(),
                paymentMethod: action.data.paymentMethod || null,
                aiGenerated: true
              }
            });
            console.log('Income added via AI:', action.data.description || action.data.category);
            actionResults.push({ type: action.type, success: true, data: { financeId: finance.id } });
          } else if (action.type === 'update_expense') {
            console.log('Processing update_expense action:', JSON.stringify(action.data, null, 2));
            // Find finance by ID or description
            let finance = null;
            if (action.data.finance_id) {
              finance = await prisma.finance.findFirst({
                where: { id: action.data.finance_id, userId, type: 'expense' }
              });
            } else if (action.data.description) {
              // Find by description (most recent match)
              finance = await prisma.finance.findFirst({
                where: {
                  userId,
                  type: 'expense',
                  description: { contains: action.data.description, mode: 'insensitive' }
                },
                orderBy: { date: 'desc' }
              });
            }
            if (!finance) {
              console.error('Expense not found for update:', action.data);
              actionResults.push({ type: action.type, success: false, error: 'Expense not found' });
              continue;
            }
            const updateData: any = {};
            if (action.data.amount !== undefined) updateData.amount = parseFloat(action.data.amount);
            if (action.data.category) updateData.category = action.data.category;
            if (action.data.description !== undefined) updateData.description = action.data.description;
            if (action.data.date) updateData.date = new Date(action.data.date);
            await prisma.finance.update({ where: { id: finance.id }, data: updateData });
            console.log('Expense updated via AI:', finance.id);
            actionResults.push({ type: action.type, success: true, data: { financeId: finance.id } });
          } else if (action.type === 'update_income') {
            console.log('Processing update_income action:', JSON.stringify(action.data, null, 2));
            // Find finance by ID or description
            let finance = null;
            if (action.data.finance_id) {
              finance = await prisma.finance.findFirst({
                where: { id: action.data.finance_id, userId, type: 'income' }
              });
            } else if (action.data.description) {
              // Find by description (most recent match)
              finance = await prisma.finance.findFirst({
                where: {
                  userId,
                  type: 'income',
                  description: { contains: action.data.description, mode: 'insensitive' }
                },
                orderBy: { date: 'desc' }
              });
            }
            if (!finance) {
              console.error('Income not found for update:', action.data);
              actionResults.push({ type: action.type, success: false, error: 'Income not found' });
              continue;
            }
            const updateData: any = {};
            if (action.data.amount !== undefined) updateData.amount = parseFloat(action.data.amount);
            if (action.data.category) updateData.category = action.data.category;
            if (action.data.description !== undefined) updateData.description = action.data.description;
            if (action.data.date) updateData.date = new Date(action.data.date);
            await prisma.finance.update({ where: { id: finance.id }, data: updateData });
            console.log('Income updated via AI:', finance.id);
            actionResults.push({ type: action.type, success: true, data: { financeId: finance.id } });
          } else if (action.type === 'add_savings_goal') {
            console.log('Processing add_savings_goal action:', JSON.stringify(action.data, null, 2));
            const goal = await prisma.savingsGoal.create({
              data: {
                userId,
                title: action.data.title,
                targetAmount: parseFloat(action.data.targetAmount),
                category: action.data.category || null,
                dueDate: action.data.dueDate ? new Date(action.data.dueDate) : null,
                description: action.data.description || null,
                priority: action.data.priority || 'medium',
                aiGenerated: true
              }
            });
            console.log('Savings goal added via AI:', action.data.title);
            actionResults.push({ type: action.type, success: true, data: { goalId: goal.id, goalTitle: goal.title } });
          } else if (action.type === 'update_savings_goal') {
            console.log('Processing update_savings_goal action:', JSON.stringify(action.data, null, 2));
            let goal = null;
            if (action.data.goal_id) {
              goal = await prisma.savingsGoal.findUnique({ where: { id: action.data.goal_id } });
            } else if (action.data.title) {
              goal = await prisma.savingsGoal.findFirst({
                where: { userId, title: { contains: action.data.title, mode: 'insensitive' } }
              });
            }
            if (!goal || goal.userId !== userId) {
              console.error('Savings goal not found for update:', action.data);
              continue;
            }
            const updateData: any = {};
            if (action.data.title) updateData.title = action.data.title;
            if (action.data.targetAmount !== undefined) updateData.targetAmount = parseFloat(action.data.targetAmount);
            if (action.data.currentAmount !== undefined) updateData.currentAmount = parseFloat(action.data.currentAmount);
            if (action.data.dueDate !== undefined) updateData.dueDate = action.data.dueDate ? new Date(action.data.dueDate) : null;
            if (action.data.status) updateData.status = action.data.status;
            await prisma.savingsGoal.update({ where: { id: goal.id }, data: updateData });
            console.log('Savings goal updated via AI:', goal.title);
            actionResults.push({ type: action.type, success: true, data: { goalId: goal.id } });
          } else if (action.type === 'delete_finance') {
            console.log('Processing delete_finance action:', JSON.stringify(action.data, null, 2));
            // Find finance by ID or description
            let finance = null;
            if (action.data.finance_id) {
              finance = await prisma.finance.findFirst({
                where: { id: action.data.finance_id, userId }
              });
            } else if (action.data.description) {
              // Find by description (most recent match)
              finance = await prisma.finance.findFirst({
                where: {
                  userId,
                  description: { contains: action.data.description, mode: 'insensitive' }
                },
                orderBy: { date: 'desc' }
              });
            }
            if (!finance) {
              console.error('Finance record not found for delete:', action.data);
              actionResults.push({ type: action.type, success: false, error: 'Finance record not found' });
              continue;
            }
            await prisma.finance.delete({ where: { id: finance.id } });
            console.log('Finance record deleted via AI:', finance.id);
            actionResults.push({ type: action.type, success: true });
          } else if (action.type === 'add_journal') {
            console.log('Processing add_journal action:', JSON.stringify(action.data, null, 2));
            const journal = await prisma.journal.create({
              data: {
                userId,
                title: action.data.title,
                content: action.data.content,
                mood: action.data.mood || null,
                tags: action.data.tags || [],
                date: action.data.date ? new Date(action.data.date) : new Date()
              }
            });
            console.log('Journal entry added via AI:', action.data.title);
            actionResults.push({ type: action.type, success: true, data: { journalId: journal.id } });
          } else if (action.type === 'update_journal') {
            console.log('Processing update_journal action:', JSON.stringify(action.data, null, 2));
            const journal = await prisma.journal.findFirst({
              where: { id: action.data.journal_id, userId }
            });
            if (!journal) {
              console.error('Journal entry not found for update:', action.data);
              continue;
            }
            const updateData: any = {};
            if (action.data.title) updateData.title = action.data.title;
            if (action.data.content !== undefined) updateData.content = action.data.content;
            if (action.data.mood) updateData.mood = action.data.mood;
            if (action.data.tags) updateData.tags = action.data.tags;
            await prisma.journal.update({ where: { id: journal.id }, data: updateData });
            console.log('Journal entry updated via AI:', journal.title);
            actionResults.push({ type: action.type, success: true, data: { journalId: journal.id } });
          } else if (action.type === 'delete_journal') {
            console.log('Processing delete_journal action:', JSON.stringify(action.data, null, 2));
            const journal = await prisma.journal.findFirst({
              where: { id: action.data.journal_id, userId }
            });
            if (!journal) {
              console.error('Journal entry not found for delete:', action.data);
              continue;
            }
            await prisma.journal.delete({ where: { id: journal.id } });
            console.log('Journal entry deleted via AI:', journal.id);
            actionResults.push({ type: action.type, success: true });
          } else if (action.type === 'add_lifestyle') {
            console.log('Processing add_lifestyle action:', JSON.stringify(action.data, null, 2));
            const lifestyle = await prisma.lifestyle.create({
              data: {
                userId,
                date: action.data.date ? new Date(action.data.date) : new Date(),
                sleepHours: action.data.sleepHours ? parseFloat(action.data.sleepHours) : null,
                exerciseMinutes: action.data.exerciseMinutes ? parseInt(action.data.exerciseMinutes) : null,
                waterIntake: action.data.waterIntake ? parseFloat(action.data.waterIntake) : null,
                mealQuality: action.data.mealQuality || null,
                stressLevel: action.data.stressLevel ? parseInt(action.data.stressLevel) : null,
                notes: action.data.notes || null
              }
            });
            console.log('Lifestyle record added via AI');
            actionResults.push({ type: action.type, success: true, data: { lifestyleId: lifestyle.id } });
          } else if (action.type === 'update_lifestyle') {
            console.log('Processing update_lifestyle action:', JSON.stringify(action.data, null, 2));
            const lifestyle = await prisma.lifestyle.findFirst({
              where: { id: action.data.lifestyle_id, userId }
            });
            if (!lifestyle) {
              console.error('Lifestyle record not found for update:', action.data);
              continue;
            }
            const updateData: any = {};
            if (action.data.sleepHours !== undefined) updateData.sleepHours = action.data.sleepHours ? parseFloat(action.data.sleepHours) : null;
            if (action.data.exerciseMinutes !== undefined) updateData.exerciseMinutes = action.data.exerciseMinutes ? parseInt(action.data.exerciseMinutes) : null;
            if (action.data.waterIntake !== undefined) updateData.waterIntake = action.data.waterIntake ? parseFloat(action.data.waterIntake) : null;
            if (action.data.mealQuality) updateData.mealQuality = action.data.mealQuality;
            if (action.data.stressLevel !== undefined) updateData.stressLevel = action.data.stressLevel ? parseInt(action.data.stressLevel) : null;
            if (action.data.notes !== undefined) updateData.notes = action.data.notes;
            await prisma.lifestyle.update({ where: { id: lifestyle.id }, data: updateData });
            console.log('Lifestyle record updated via AI');
            actionResults.push({ type: action.type, success: true, data: { lifestyleId: lifestyle.id } });
          } else if (action.type === 'delete_lifestyle') {
            console.log('Processing delete_lifestyle action:', JSON.stringify(action.data, null, 2));
            const lifestyle = await prisma.lifestyle.findFirst({
              where: { id: action.data.lifestyle_id, userId }
            });
            if (!lifestyle) {
              console.error('Lifestyle record not found for delete:', action.data);
              continue;
            }
            await prisma.lifestyle.delete({ where: { id: lifestyle.id } });
            console.log('Lifestyle record deleted via AI:', lifestyle.id);
            actionResults.push({ type: action.type, success: true });
          } else if (action.type === 'add_habit') {
            console.log('Processing add_habit action:', JSON.stringify(action.data, null, 2));
            const habit = await prisma.habit.create({
              data: {
                userId,
                name: action.data.name,
                target: action.data.target || 'Daily',
                time: action.data.time || '00:00',
                color: action.data.color || 'from-blue-500 to-cyan-500',
                icon: action.data.icon || '⭐',
                streak: 0,
                completed: false
              }
            });
            console.log('Habit added via AI:', action.data.name);
            actionResults.push({ type: action.type, success: true, data: { habitId: habit.id, habitName: habit.name } });
          } else if (action.type === 'update_habit') {
            console.log('Processing update_habit action:', JSON.stringify(action.data, null, 2));
            const habit = await prisma.habit.findFirst({
              where: { id: action.data.habit_id, userId }
            });
            if (!habit) {
              console.error('Habit not found for update:', action.data);
              continue;
            }
            const updateData: any = {};
            if (action.data.name) updateData.name = action.data.name;
            if (action.data.target) updateData.target = action.data.target;
            if (action.data.time) updateData.time = action.data.time;
            if (action.data.color) updateData.color = action.data.color;
            if (action.data.icon) updateData.icon = action.data.icon;
            await prisma.habit.update({ where: { id: habit.id }, data: updateData });
            console.log('Habit updated via AI:', habit.name);
            actionResults.push({ type: action.type, success: true, data: { habitId: habit.id } });
          } else if (action.type === 'delete_habit') {
            console.log('Processing delete_habit action:', JSON.stringify(action.data, null, 2));
            const habit = await prisma.habit.findFirst({
              where: { id: action.data.habit_id, userId }
            });
            if (!habit) {
              console.error('Habit not found for delete:', action.data);
              continue;
            }
            await prisma.habit.delete({ where: { id: habit.id } });
            console.log('Habit deleted via AI:', habit.id);
            actionResults.push({ type: action.type, success: true });
          } else if (action.type === 'toggle_habit') {
            console.log('Processing toggle_habit action:', JSON.stringify(action.data, null, 2));
            const habit = await prisma.habit.findFirst({
              where: { id: action.data.habit_id, userId }
            });
            if (!habit) {
              console.error('Habit not found for toggle:', action.data);
              continue;
            }
            // Toggle completion status for today
            const newCompleted = !habit.completed;
            const today = new Date().toISOString().split('T')[0];
            const history = (habit.completionHistory as any) || [];
            const existingEntryIndex = history.findIndex((entry: any) => entry.date === today);
            let newHistory;
            if (existingEntryIndex >= 0) {
              newHistory = [...history];
              newHistory[existingEntryIndex] = { date: today, completed: newCompleted };
            } else {
              newHistory = [...history, { date: today, completed: newCompleted }];
            }
            // Calculate streak
            const calculateStreak = (completionHistory: { date: string; completed: boolean }[]) => {
              if (completionHistory.length === 0) return 0;
              const sorted = [...completionHistory]
                .filter(entry => entry.completed)
                .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
              if (sorted.length === 0) return 0;
              let streak = 0;
              const todayDate = new Date();
              todayDate.setHours(0, 0, 0, 0);
              for (let i = 0; i < sorted.length; i++) {
                const entryDate = new Date(sorted[i].date);
                entryDate.setHours(0, 0, 0, 0);
                const daysDiff = Math.floor((todayDate.getTime() - entryDate.getTime()) / (1000 * 60 * 60 * 24));
                if (daysDiff === i) {
                  streak++;
                } else {
                  break;
                }
              }
              return streak;
            };
            const newStreak = calculateStreak(newHistory);
            await prisma.habit.update({
              where: { id: habit.id },
              data: {
                completed: newCompleted,
                completionHistory: newHistory,
                streak: newStreak
              }
            });
            console.log('Habit toggled via AI:', habit.name, newCompleted ? 'completed' : 'incomplete');
            actionResults.push({ type: action.type, success: true, data: { habitId: habit.id, completed: newCompleted } });
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
    console.error('Error stack:', error.stack);
    console.error('Error name:', error.name);
    console.error('Error message:', error.message);
    if (error.response) {
      console.error('Error response:', error.response.data);
    }
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to process chat message',
      details: process.env.NODE_ENV === 'development' ? {
        stack: error.stack,
        name: error.name
      } : undefined
    });
  }
};

