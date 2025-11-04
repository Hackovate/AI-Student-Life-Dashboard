import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate, AuthRequest } from '../middleware/auth.middleware';

const router = Router();
const prisma = new PrismaClient();

// All routes require authentication
router.use(authenticate);

// Get today's class schedules with attendance status for a course
router.get('/:courseId/today', async (req: AuthRequest, res) => {
  try {
    const { courseId } = req.params;
    
    // Verify course ownership
    const course = await prisma.course.findUnique({ where: { id: courseId } });
    if (!course || course.userId !== req.userId) {
      return res.status(404).json({ error: 'Course not found' });
    }

    // Get current day of week
    const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const today = new Date();
    const dayName = daysOfWeek[today.getDay()];
    
    // Get today's date at midnight for comparison
    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());

    // Get all class schedules for today's day of week
    const schedules = await prisma.classSchedule.findMany({
      where: { 
        courseId,
        day: dayName
      },
      orderBy: { time: 'asc' }
    });

    // Get attendance records for today
    const attendanceRecords = await prisma.attendanceRecord.findMany({
      where: {
        courseId,
        userId: req.userId,
        date: {
          gte: todayStart,
          lt: new Date(todayStart.getTime() + 24 * 60 * 60 * 1000)
        }
      }
    });

    // Combine schedules with attendance status
    const schedulesWithAttendance = schedules.map(schedule => {
      const attendance = attendanceRecords.find(r => r.classScheduleId === schedule.id);
      return {
        ...schedule,
        attendanceStatus: attendance?.status || null,
        attendanceId: attendance?.id || null,
        attendanceNotes: attendance?.notes || null
      };
    });

    res.json(schedulesWithAttendance);
  } catch (error) {
    console.error('Error fetching today\'s classes:', error);
    res.status(500).json({ error: 'Error fetching today\'s classes' });
  }
});

// Get all class schedules with attendance history for a course
router.get('/:courseId/all', async (req: AuthRequest, res) => {
  try {
    const { courseId } = req.params;
    
    // Verify course ownership
    const course = await prisma.course.findUnique({ where: { id: courseId } });
    if (!course || course.userId !== req.userId) {
      return res.status(404).json({ error: 'Course not found' });
    }

    // Get all class schedules
    const schedules = await prisma.classSchedule.findMany({
      where: { courseId },
      orderBy: { day: 'asc' },
      include: {
        attendanceRecords: {
          where: { userId: req.userId },
          orderBy: { date: 'desc' }
        }
      }
    });

    res.json(schedules);
  } catch (error) {
    console.error('Error fetching schedules:', error);
    res.status(500).json({ error: 'Error fetching class schedules' });
  }
});

// Mark attendance for a specific class schedule
router.post('/:courseId/mark', async (req: AuthRequest, res) => {
  try {
    const { courseId } = req.params;
    const { classScheduleId, status, notes, date } = req.body; // status: "present", "absent", "late"
    
    // Verify course ownership
    const course = await prisma.course.findUnique({ where: { id: courseId } });
    if (!course || course.userId !== req.userId) {
      return res.status(404).json({ error: 'Course not found' });
    }

    // Verify class schedule belongs to this course
    const schedule = await prisma.classSchedule.findUnique({ where: { id: classScheduleId } });
    if (!schedule || schedule.courseId !== courseId) {
      return res.status(404).json({ error: 'Class schedule not found' });
    }

    // Use provided date or default to today
    const attendanceDate = date ? new Date(date) : new Date();
    attendanceDate.setHours(0, 0, 0, 0);

    // Check if attendance already marked for this schedule on this date
    const existing = await prisma.attendanceRecord.findFirst({
      where: {
        classScheduleId,
        userId: req.userId!,
        date: attendanceDate
      }
    });

    let record;
    if (existing) {
      // Update existing record
      record = await prisma.attendanceRecord.update({
        where: { id: existing.id },
        data: { status, notes }
      });
    } else {
      // Create new record
      record = await prisma.attendanceRecord.create({
        data: {
          courseId,
          classScheduleId,
          userId: req.userId!,
          date: attendanceDate,
          status,
          notes
        }
      });
    }

    // Recalculate attendance percentage
    const allRecords = await prisma.attendanceRecord.findMany({
      where: { courseId, userId: req.userId }
    });
    
    const totalClasses = allRecords.length;
    const presentClasses = allRecords.filter((r: any) => r.status === 'present' || r.status === 'late').length;
    const attendancePercentage = totalClasses > 0 ? (presentClasses / totalClasses) * 100 : 0;

    // Update course attendance percentage
    await prisma.course.update({
      where: { id: courseId },
      data: { attendance: attendancePercentage }
    });

    res.status(201).json({ record, attendancePercentage });
  } catch (error) {
    console.error('Error marking attendance:', error);
    res.status(500).json({ error: 'Error marking attendance' });
  }
});

// Delete attendance record
router.delete('/:recordId', async (req: AuthRequest, res) => {
  try {
    const { recordId } = req.params;
    
    // Verify ownership
    const existing = await prisma.attendanceRecord.findUnique({ where: { id: recordId } });
    if (!existing || existing.userId !== req.userId) {
      return res.status(404).json({ error: 'Record not found' });
    }

    await prisma.attendanceRecord.delete({ where: { id: recordId } });

    // Recalculate attendance percentage
    const allRecords = await prisma.attendanceRecord.findMany({
      where: { courseId: existing.courseId, userId: req.userId }
    });
    
    const totalClasses = allRecords.length;
    const presentClasses = allRecords.filter((r: any) => r.status === 'present' || r.status === 'late').length;
    const attendancePercentage = totalClasses > 0 ? (presentClasses / totalClasses) * 100 : 0;

    await prisma.course.update({
      where: { id: existing.courseId },
      data: { attendance: attendancePercentage }
    });

    res.json({ message: 'Attendance record deleted', attendancePercentage });
  } catch (error) {
    console.error('Error deleting attendance:', error);
    res.status(500).json({ error: 'Error deleting attendance record' });
  }
});

// Get attendance statistics for a course (schedule-based)
router.get('/:courseId/stats', async (req: AuthRequest, res) => {
  try {
    const { courseId } = req.params;
    
    // Verify course ownership
    const course = await prisma.course.findUnique({ where: { id: courseId } });
    if (!course || course.userId !== req.userId) {
      return res.status(404).json({ error: 'Course not found' });
    }

    // Get all class schedules with attendance records
    const schedules = await prisma.classSchedule.findMany({
      where: { courseId },
      include: {
        attendanceRecords: {
          where: { userId: req.userId },
          orderBy: { date: 'desc' }
        }
      }
    });

    // Calculate overall statistics
    const allRecords = schedules.flatMap((s: any) => s.attendanceRecords);
    
    const totalClasses = allRecords.length;
    const present = allRecords.filter((r: any) => r.status === 'present').length;
    const absent = allRecords.filter((r: any) => r.status === 'absent').length;
    const late = allRecords.filter((r: any) => r.status === 'late').length;
    const attendancePercentage = totalClasses > 0 ? ((present + late) / totalClasses) * 100 : 0;

    // Group by schedule for detailed breakdown
    const bySchedule = schedules.map((schedule: any) => ({
      scheduleId: schedule.id,
      day: schedule.day,
      time: schedule.time,
      type: schedule.type,
      location: schedule.location,
      totalClasses: schedule.attendanceRecords.length,
      present: schedule.attendanceRecords.filter((r: any) => r.status === 'present').length,
      absent: schedule.attendanceRecords.filter((r: any) => r.status === 'absent').length,
      late: schedule.attendanceRecords.filter((r: any) => r.status === 'late').length,
    }));

    res.json({
      totalClasses,
      present,
      absent,
      late,
      attendancePercentage,
      bySchedule,
      totalSchedules: schedules.length
    });
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({ error: 'Error fetching attendance statistics' });
  }
});

export default router;
