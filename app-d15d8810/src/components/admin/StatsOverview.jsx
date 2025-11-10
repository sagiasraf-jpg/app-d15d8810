import React from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, FileText, Shield, TrendingUp } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export default function StatsOverview() {
  const { data: users, isLoading: loadingUsers } = useQuery({
    queryKey: ['all-users'],
    queryFn: () => base44.entities.User.list(),
    initialData: [],
  });

  const { data: submissions, isLoading: loadingSubmissions } = useQuery({
    queryKey: ['all-submissions-stats'],
    queryFn: () => base44.entities.LotterySelection.list(),
    initialData: [],
    refetchInterval: 5000, // ✅ רענון אוטומטי כל 5 שניות
  });

  // ✅ ספירת שליחות ירוקות בלבד (ללא מחוקים על ידי מנהל)
  const greenSubmissions = submissions.filter(s => 
    s.color_tag === "green" && s.deleted_by_admin !== true
  );

  const stats = [
    {
      title: "סה\"כ משתמשים",
      value: users.length,
      icon: Users,
      color: "from-blue-500 to-cyan-500",
      bgColor: "from-blue-50 to-cyan-50",
    },
    {
      title: "מנהלי מערכת",
      value: users.filter(u => u.role === "admin").length,
      icon: Shield,
      color: "from-purple-500 to-pink-500",
      bgColor: "from-purple-50 to-pink-50",
    },
    {
      title: "סה\"כ שליחות",
      value: greenSubmissions.length,
      icon: FileText,
      color: "from-amber-500 to-orange-500",
      bgColor: "from-amber-50 to-orange-50",
    },
    {
      title: "משתמשים פעילים",
      value: users.filter(u => u.last_login).length,
      icon: TrendingUp,
      color: "from-green-500 to-emerald-500",
      bgColor: "from-green-50 to-emerald-50",
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3" dir="rtl">
      {stats.map((stat, index) => (
        <Card key={index} className="overflow-hidden border-2 shadow-lg hover:shadow-xl transition-shadow duration-300">
          <CardHeader className={`pb-2 bg-gradient-to-br ${stat.bgColor} px-3 pt-3`}>
            <CardTitle className="text-xs font-medium text-gray-600 flex items-center justify-between">
              <span className="truncate">{stat.title}</span>
              <div className={`w-8 h-8 bg-gradient-to-br ${stat.color} rounded-lg flex items-center justify-center shadow-md`}>
                <stat.icon className="w-4 h-4 text-white" />
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-2 px-3 pb-3">
            {loadingUsers || loadingSubmissions ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}