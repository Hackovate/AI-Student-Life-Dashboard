import { useState, useEffect, useMemo } from 'react';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { ChevronLeft, ChevronRight, Calendar, Clock, MapPin, GraduationCap } from 'lucide-react';

interface WeeklyCalendarProps {
  courses: any[];
  exams: any[];
}

export function WeeklyCalendar({ courses, exams }: WeeklyCalendarProps) {
  const [currentWeekStart, setCurrentWeekStart] = useState(() => {
    const today = new Date();
    const day = today.getDay();
    const diff = today.getDate() - day + (day === 0 ? -6 : 1); // Adjust to Monday
    const monday = new Date(today.setDate(diff));
    monday.setHours(0, 0, 0, 0);
    return monday;
  });

  const weekDays = useMemo(() => {
    const days = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date(currentWeekStart);
      date.setDate(currentWeekStart.getDate() + i);
      days.push({
        date,
        dayName: date.toLocaleDateString('en-US', { weekday: 'short' }),
        dayNumber: date.getDate(),
        isToday: date.toDateString() === new Date().toDateString(),
        fullDate: date.toISOString().split('T')[0]
      });
    }
    return days;
  }, [currentWeekStart]);

  const getDayOfWeek = (dayName: string): number => {
    const dayMap: { [key: string]: number } = {
      'Monday': 0, 'Mon': 0,
      'Tuesday': 1, 'Tue': 1,
      'Wednesday': 2, 'Wed': 2,
      'Thursday': 3, 'Thu': 3,
      'Friday': 4, 'Fri': 4,
      'Saturday': 5, 'Sat': 5,
      'Sunday': 6, 'Sun': 6
    };
    return dayMap[dayName] ?? -1;
  };

  const getEventsForDay = (dayIndex: number, fullDate: string) => {
    const events: any[] = [];
    const dayName = weekDays[dayIndex].dayName;

    // Get classes for this day
    courses.forEach((course) => {
      if (course.classSchedule) {
        course.classSchedule.forEach((schedule: any) => {
          const scheduleDayIndex = getDayOfWeek(schedule.day);
          if (scheduleDayIndex === dayIndex) {
            events.push({
              id: `class-${schedule.id}`,
              type: 'class',
              title: course.name,
              time: schedule.time,
              location: schedule.location,
              scheduleType: schedule.type,
              courseId: course.id,
              courseName: course.name
            });
          }
        });
      }
    });

    // Get exams for this day
    exams.forEach((exam) => {
      const examDate = new Date(exam.date).toISOString().split('T')[0];
      if (examDate === fullDate) {
        events.push({
          id: `exam-${exam.id}`,
          type: 'exam',
          title: exam.title || exam.type,
          time: exam.time || 'All Day',
          location: exam.location,
          subject: exam.subject || exam.courseName,
          courseId: exam.courseId
        });
      }
    });

    return events.sort((a, b) => {
      // Sort by time if available
      if (a.time && b.time && a.time !== 'All Day' && b.time !== 'All Day') {
        return a.time.localeCompare(b.time);
      }
      // Exams first, then classes
      if (a.type !== b.type) {
        return a.type === 'exam' ? -1 : 1;
      }
      return 0;
    });
  };

  const navigateWeek = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentWeekStart);
    newDate.setDate(newDate.getDate() + (direction === 'next' ? 7 : -7));
    setCurrentWeekStart(newDate);
  };

  const goToToday = () => {
    const today = new Date();
    const day = today.getDay();
    const diff = today.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(today.setDate(diff));
    monday.setHours(0, 0, 0, 0);
    setCurrentWeekStart(monday);
  };

  const getTypeBadge = (type: string) => {
    const colors: any = {
      'Lecture': 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300',
      'Lab': 'bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300',
      'Tutorial': 'bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300',
      'Seminar': 'bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-300'
    };
    return (
      <Badge variant="outline" className={`text-xs ${colors[type] || 'bg-gray-100 text-gray-700'}`}>
        {type}
      </Badge>
    );
  };

  return (
    <Card className="p-4 border-border bg-card">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-foreground text-xl font-semibold mb-0.5">Weekly Calendar</h2>
          <p className="text-muted-foreground text-xs">Classes and exams for this week</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            className="h-7 w-7"
            onClick={() => navigateWeek('prev')}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-7 px-3 text-xs font-medium"
            onClick={goToToday}
          >
            Today
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="h-7 w-7"
            onClick={() => navigateWeek('next')}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Week Header */}
      <div className="grid grid-cols-7 gap-2 mb-2">
        {weekDays.map((day, index) => (
          <div
            key={index}
            className={`text-center py-2 rounded-lg ${
              day.isToday
                ? 'bg-primary text-primary-foreground font-semibold'
                : 'bg-muted/50 text-muted-foreground'
            }`}
          >
            <div className="text-xs font-medium">{day.dayName}</div>
            <div className={`text-sm mt-0.5 ${day.isToday ? 'font-bold' : 'font-medium'}`}>
              {day.dayNumber}
            </div>
          </div>
        ))}
      </div>

      {/* Week Grid */}
      <div className="grid grid-cols-7 gap-2 min-h-[400px]">
        {weekDays.map((day, dayIndex) => {
          const events = getEventsForDay(dayIndex, day.fullDate);
          return (
            <div
              key={dayIndex}
              className={`border rounded-lg p-2 min-h-[200px] ${
                day.isToday
                  ? 'border-primary bg-primary/5'
                  : 'border-border bg-card'
              }`}
            >
              <div className="space-y-1.5">
                {events.length === 0 ? (
                  <div className="text-center py-4 text-xs text-muted-foreground">
                    No events
                  </div>
                ) : (
                  events.map((event) => (
                    <div
                      key={event.id}
                      className={`p-2 rounded border text-xs ${
                        event.type === 'exam'
                          ? 'bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800'
                          : 'bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-1 mb-1">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1 mb-0.5">
                            {event.type === 'exam' ? (
                              <GraduationCap className="h-3 w-3 text-red-600 dark:text-red-400 flex-shrink-0" />
                            ) : (
                              <Calendar className="h-3 w-3 text-blue-600 dark:text-blue-400 flex-shrink-0" />
                            )}
                            <span className="font-semibold truncate">
                              {event.title}
                            </span>
                          </div>
                          {event.type === 'exam' && event.subject && (
                            <div className="text-muted-foreground truncate text-[10px] mb-0.5">
                              {event.subject}
                            </div>
                          )}
                          {event.scheduleType && (
                            <div className="mb-1">
                              {getTypeBadge(event.scheduleType)}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                        <Clock className="h-2.5 w-2.5" />
                        <span>{event.time}</span>
                        {event.location && (
                          <>
                            <MapPin className="h-2.5 w-2.5 ml-1" />
                            <span className="truncate">{event.location}</span>
                          </>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}


