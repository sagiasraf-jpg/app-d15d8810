
import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Search, Filter } from "lucide-react";
// Removed: import { format } from "date-fns";
// Removed: import { he } from "date-fns/locale";
import { Skeleton } from "@/components/ui/skeleton";

const actionLabels = {
  login: "התחברות",
  logout: "התנתקות",
  lottery_submission: "שליחת לוטו",
  profile_update: "עדכון פרופיל"
};

const actionColors = {
  login: "bg-green-100 text-green-800 border-green-300",
  logout: "bg-gray-100 text-gray-800 border-gray-300",
  lottery_submission: "bg-blue-100 text-blue-800 border-blue-300",
  profile_update: "bg-yellow-100 text-yellow-800 border-yellow-300"
};

export default function ActivityLogView() {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterAction, setFilterAction] = useState("all");

  const { data: logs, isLoading } = useQuery({
    queryKey: ['activity-logs'],
    queryFn: () => base44.entities.ActivityLog.list('-created_date', 100),
    initialData: [],
  });

  const filteredLogs = logs.filter(log => {
    const matchesSearch = !searchTerm ||
      log.user_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.user_email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.details?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesAction = filterAction === "all" || log.action === filterAction;
    
    return matchesSearch && matchesAction;
  });

  return (
    <Card className="border-2 border-purple-200 shadow-xl" dir="rtl">
      <CardHeader className="bg-gradient-to-r from-purple-50 to-pink-50 border-b-2 border-purple-200 p-4 md:p-6">
        <CardTitle className="text-lg md:text-2xl font-bold text-purple-900">לוג פעילות מערכת</CardTitle>
      </CardHeader>
      <CardContent className="p-3 md:p-6">
        {/* Filters */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4 mb-4 md:mb-6">
          <div className="relative">
            <Search className="absolute right-3 top-3 h-4 w-4 text-gray-400" />
            <Input
              placeholder="חיפוש..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pr-10 border-purple-300 focus:border-purple-500 text-sm"
            />
          </div>
          <Select value={filterAction} onValueChange={setFilterAction}>
            <SelectTrigger className="border-purple-300 focus:border-purple-500 text-sm">
              <Filter className="w-4 h-4 ml-2" />
              <SelectValue placeholder="סנן לפי סוג פעולה" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">כל הפעולות</SelectItem>
              <SelectItem value="login">התחברות</SelectItem>
              <SelectItem value="logout">התנתקות</SelectItem>
              <SelectItem value="lottery_submission">שליחת לוטו</SelectItem>
              <SelectItem value="profile_update">עדכון פרופיל</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <p className="text-gray-600 font-semibold mb-4 text-sm md:text-base">
          סה"כ {filteredLogs.length} פעולות
        </p>

        {/* Mobile View - Cards */}
        <div className="md:hidden space-y-3">
          {isLoading ? (
            Array(3).fill(0).map((_, i) => (
              <Card key={i} className="border-2 border-purple-200">
                <CardContent className="p-3">
                  <Skeleton className="h-24 w-full" />
                </CardContent>
              </Card>
            ))
          ) : filteredLogs.length === 0 ? (
            <Card className="border-2 border-gray-200">
              <CardContent className="p-6 text-center text-gray-500 text-sm">
                לא נמצאו פעולות
              </CardContent>
            </Card>
          ) : (
            filteredLogs.map((log) => (
              <Card key={log.id} className="border-2 border-purple-200">
                <CardContent className="p-3 space-y-3">
                  {/* Header - Badge */}
                  <div className="flex items-center justify-between">
                    <Badge className={`${actionColors[log.action] || 'bg-gray-100 text-gray-800 border-gray-300'} border font-semibold text-xs`}>
                      {actionLabels[log.action] || log.action}
                    </Badge>
                    <span className="text-xs text-gray-500">
                      {new Date(log.created_date).toLocaleTimeString('he-IL', { timeZone: 'Asia/Jerusalem', hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>

                  {/* User Info */}
                  <div>
                    <p className="font-bold text-base text-purple-900">{log.user_name}</p>
                    <p className="text-sm text-gray-600">{log.user_email}</p>
                  </div>

                  {/* Details */}
                  <div className="bg-gray-50 rounded-lg p-2 border border-gray-200">
                    <p className="text-sm text-gray-700">{log.details}</p>
                  </div>

                  {/* Date */}
                  <div className="flex items-center gap-2 text-xs text-gray-600">
                    <span>📅 תאריך:</span>
                    <span>{new Date(log.created_date).toLocaleDateString('he-IL', { timeZone: 'Asia/Jerusalem' })}</span>
                    <span>🕒 שעה:</span>
                    <span>{new Date(log.created_date).toLocaleTimeString('he-IL', { timeZone: 'Asia/Jerusalem', hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        {/* Desktop View - Table */}
        <div className="hidden md:block border-2 border-purple-200 rounded-lg overflow-x-auto">
          <div className="min-w-[800px]">
            <Table>
              <TableHeader>
                <TableRow className="bg-gradient-to-r from-purple-100 to-pink-100">
                  <TableHead className="font-bold text-purple-900">משתמש</TableHead>
                  <TableHead className="font-bold text-purple-900">סוג פעולה</TableHead>
                  <TableHead className="font-bold text-purple-900">פרטים</TableHead>
                  <TableHead className="font-bold text-purple-900">תאריך ושעה</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array(10).fill(0).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                      <TableCell><Skeleton className="h-6 w-24" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-48" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                    </TableRow>
                  ))
                ) : filteredLogs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-12 text-gray-500">
                      לא נמצאו פעולות
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredLogs.map((log) => (
                    <TableRow key={log.id} className="hover:bg-purple-50 transition-colors">
                      <TableCell>
                        <div>
                          <p className="font-semibold">{log.user_name}</p>
                          <p className="text-sm text-gray-500">{log.user_email}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={`${actionColors[log.action] || 'bg-gray-100 text-gray-800 border-gray-300'} border font-semibold`}>
                          {actionLabels[log.action] || log.action}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-gray-600">
                        {log.details}
                      </TableCell>
                      <TableCell className="text-gray-600 text-sm">
                        📅 {new Date(log.created_date).toLocaleDateString('he-IL', { timeZone: 'Asia/Jerusalem' })}
                        <br />
                        🕒 {new Date(log.created_date).toLocaleTimeString('he-IL', { timeZone: 'Asia/Jerusalem', hour: '2-digit', minute: '2-digit' })}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
