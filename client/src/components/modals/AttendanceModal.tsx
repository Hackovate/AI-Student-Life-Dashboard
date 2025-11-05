import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../ui/dialog';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Check, X, Clock, Calendar, MapPin } from 'lucide-react';
import { attendanceAPI } from '@/lib/api';

interface AttendanceModalProps {
  open: boolean;
  onClose: () => void;
  courseId: string;
  courseName: string;
  onAttendanceUpdate: () => void;
}

export function AttendanceModal({ open, onClose, courseId, courseName, onAttendanceUpdate }: AttendanceModalProps) {
  const [todaysClasses, setTodaysClasses] = useState<any[]>([]);
  const [allSchedules, setAllSchedules] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open && courseId) {
      loadData();
    }
  }, [open, courseId]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [todayData, allData, statsData] = await Promise.all([
        attendanceAPI.getTodaysClasses(courseId),
        attendanceAPI.getAllSchedules(courseId),
        attendanceAPI.getStats(courseId)
      ]);
      setTodaysClasses(todayData);
      setAllSchedules(allData);
      setStats(statsData);
    } catch (err) {
      console.error('Failed to load attendance data', err);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAttendance = async (classScheduleId: string, status: string) => {
    try {
      await attendanceAPI.markAttendance(courseId, classScheduleId, status);
      await loadData();
      onAttendanceUpdate();
    } catch (err) {
      console.error('Failed to mark attendance', err);
      alert('Failed to mark attendance');
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'present':
        return <Badge className="bg-green-500">Present</Badge>;
      case 'absent':
        return <Badge className="bg-red-500">Absent</Badge>;
      case 'late':
        return <Badge className="bg-yellow-500">Late</Badge>;
      default:
        return <Badge variant="outline">Not Marked</Badge>;
    }
  };

  const getTypeBadge = (type: string) => {
    const colors: any = {
      'Lecture': 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300',
      'Lab': 'bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300',
      'Tutorial': 'bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300',
      'Seminar': 'bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-300'
    };
    return (
      <Badge variant="outline" className={colors[type] || 'bg-gray-100 text-gray-700'}>
        {type}
      </Badge>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader className="pb-3">
          <DialogTitle className="text-lg">Attendance - {courseName}</DialogTitle>
          <DialogDescription className="text-sm">Mark attendance and view statistics.</DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="text-center py-8 text-muted-foreground">Loading...</div>
        ) : (
          <Tabs defaultValue="today" className="w-full">
            <TabsList className="self-center bg-muted/50 border border-border/60 rounded-full px-1 py-0.5 gap-1">
              <TabsTrigger value="today" className="text-sm rounded-full px-4">
                Today
              </TabsTrigger>
              <TabsTrigger value="schedule" className="text-sm rounded-full px-4">
                Schedule
              </TabsTrigger>
              <TabsTrigger value="stats" className="text-sm rounded-full px-4">
                Statistics
              </TabsTrigger>
            </TabsList>

            {/* Today's Classes Tab */}
            <TabsContent value="today" className="space-y-3 mt-4">
              {todaysClasses.length === 0 ? (
                <div className="text-center py-8">
                  <Calendar className="w-10 h-10 mx-auto mb-2 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">No classes today</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Add schedules from the course card
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {todaysClasses.map((schedule) => (
                    <div
                      key={schedule.id}
                      className="p-3 border border-border rounded-lg bg-card hover:bg-accent/50 transition-colors"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <span className="font-medium text-sm text-foreground">{schedule.time}</span>
                            {getTypeBadge(schedule.type)}
                            {schedule.attendanceStatus && getStatusBadge(schedule.attendanceStatus)}
                          </div>
                          {schedule.location && (
                            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                              <MapPin className="w-3 h-3" />
                              <span className="truncate">{schedule.location}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-1.5">
                        <Button
                          size="sm"
                          className="h-8 gap-1.5 bg-green-600 hover:bg-green-700 text-xs"
                          onClick={() => handleMarkAttendance(schedule.id, 'present')}
                        >
                          <Check className="w-3 h-3" />
                          Present
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 gap-1.5 border-yellow-500 text-yellow-600 hover:bg-yellow-50 dark:hover:bg-yellow-950 text-xs"
                          onClick={() => handleMarkAttendance(schedule.id, 'late')}
                        >
                          <Clock className="w-3 h-3" />
                          Late
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 gap-1.5 border-red-500 text-red-600 hover:bg-red-50 dark:hover:bg-red-950 text-xs"
                          onClick={() => handleMarkAttendance(schedule.id, 'absent')}
                        >
                          <X className="w-3 h-3" />
                          Absent
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>

            {/* All Schedules Tab */}
            <TabsContent value="schedule" className="space-y-3 mt-4">
              {allSchedules.length === 0 ? (
                <div className="text-center py-8">
                  <Calendar className="w-10 h-10 mx-auto mb-2 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">No schedules added</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Add schedules from the course card
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {allSchedules.map((schedule) => (
                    <div
                      key={schedule.id}
                      className="p-3 border border-border rounded-lg bg-card"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium text-sm">{schedule.day}</span>
                          <span className="text-sm text-muted-foreground">{schedule.time}</span>
                          {getTypeBadge(schedule.type)}
                        </div>
                      </div>
                      {schedule.location && (
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-2">
                          <MapPin className="w-3 h-3" />
                          {schedule.location}
                        </div>
                      )}

                      {/* Attendance History for this schedule */}
                      {schedule.attendanceRecords && schedule.attendanceRecords.length > 0 && (
                        <div className="pt-2 border-t border-border">
                          <p className="text-xs font-medium text-muted-foreground mb-1.5">Recent:</p>
                          <div className="space-y-1">
                            {schedule.attendanceRecords.slice(0, 3).map((record: any) => (
                              <div key={record.id} className="flex items-center justify-between text-xs">
                                <span className="text-muted-foreground">
                                  {new Date(record.date).toLocaleDateString('en-US', {
                                    month: 'short',
                                    day: 'numeric'
                                  })}
                                </span>
                                {getStatusBadge(record.status)}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>

            {/* Statistics Tab */}
            <TabsContent value="stats" className="space-y-3 mt-4">
              {stats && (
                <>
                  {/* Overall Statistics */}
                  <div className="grid grid-cols-4 gap-2">
                    <div className="p-2.5 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg">
                      <p className="text-blue-700 dark:text-blue-300 text-xs mb-0.5">Total</p>
                      <p className="text-blue-900 dark:text-blue-100 text-lg font-semibold">{stats.totalClasses}</p>
                    </div>
                    <div className="p-2.5 bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg">
                      <p className="text-green-700 dark:text-green-300 text-xs mb-0.5">Present</p>
                      <p className="text-green-900 dark:text-green-100 text-lg font-semibold">{stats.present}</p>
                    </div>
                    <div className="p-2.5 bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                      <p className="text-yellow-700 dark:text-yellow-300 text-xs mb-0.5">Late</p>
                      <p className="text-yellow-900 dark:text-yellow-100 text-lg font-semibold">{stats.late}</p>
                    </div>
                    <div className="p-2.5 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg">
                      <p className="text-red-700 dark:text-red-300 text-xs mb-0.5">Absent</p>
                      <p className="text-red-900 dark:text-red-100 text-lg font-semibold">{stats.absent}</p>
                    </div>
                  </div>

                  {/* Attendance Percentage */}
                  <div className="p-3 bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-950 dark:to-purple-950 border border-indigo-200 dark:border-indigo-800 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-indigo-900 dark:text-indigo-100">Attendance Rate</span>
                      <span className={`text-xl font-bold ${stats.attendancePercentage >= 75 ? 'text-green-600' : stats.attendancePercentage >= 50 ? 'text-yellow-600' : 'text-red-600'}`}>
                        {stats.attendancePercentage.toFixed(1)}%
                      </span>
                    </div>
                    <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all ${stats.attendancePercentage >= 75 ? 'bg-green-500' : stats.attendancePercentage >= 50 ? 'bg-yellow-500' : 'bg-red-500'}`}
                        style={{ width: `${Math.min(stats.attendancePercentage, 100)}%` } as React.CSSProperties}
                      />
                    </div>
                  </div>

                  {/* By Schedule Breakdown */}
                  {stats.bySchedule && stats.bySchedule.length > 0 && (
                    <div className="space-y-2">
                      <h3 className="font-semibold text-sm">By Schedule</h3>
                      {stats.bySchedule.map((scheduleStats: any) => {
                        const schedulePercentage = scheduleStats.totalClasses > 0
                          ? ((scheduleStats.present + scheduleStats.late) / scheduleStats.totalClasses) * 100
                          : 0;

                        return (
                          <div
                            key={scheduleStats.scheduleId}
                            className="p-2.5 border border-border rounded-lg bg-card"
                          >
                            <div className="flex items-start justify-between mb-1.5">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="text-sm font-medium truncate">{scheduleStats.day} {scheduleStats.time}</span>
                                  {getTypeBadge(scheduleStats.type)}
                                </div>
                                {scheduleStats.location && (
                                  <p className="text-xs text-muted-foreground truncate">{scheduleStats.location}</p>
                                )}
                              </div>
                              <span className={`text-sm font-semibold ml-2 ${schedulePercentage >= 75 ? 'text-green-600' : schedulePercentage >= 50 ? 'text-yellow-600' : 'text-red-600'}`}>
                                {schedulePercentage.toFixed(0)}%
                              </span>
                            </div>
                            <div className="flex gap-3 text-xs">
                              <span className="text-green-600">✓ {scheduleStats.present}</span>
                              <span className="text-yellow-600">⏱ {scheduleStats.late}</span>
                              <span className="text-red-600">✗ {scheduleStats.absent}</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </>
              )}
            </TabsContent>
          </Tabs>
        )}
      </DialogContent>
    </Dialog>
  );
}

