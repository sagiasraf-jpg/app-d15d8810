import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Shield, Users, FileText, AlertCircle, Lock, Trophy, Eye } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";

import UserManagement from "../components/admin/UserManagement";
import SubmissionsReport from "../components/admin/SubmissionsReport";
import StatsOverview from "../components/admin/StatsOverview";
import FormLockManager from "../components/admin/FormLockManager";
import WinningNumbersManager from "../components/admin/WinningNumbersManager";
import SelectionsPublishManager from "../components/admin/SelectionsPublishManager";

export default function AdminDashboard() {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    document.title = "פאנל ניהול 🛡️ | לוטו שכונתי";
    loadUser();
  }, []);

  const loadUser = async () => {
    try {
      const currentUser = await base44.auth.me();
      setUser(currentUser);
    } catch (error) {
      console.error("Error loading user:", error);
    }
    setIsLoading(false);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 text-lg">טוען...</p>
        </div>
      </div>
    );
  }

  if (user?.role !== "admin") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-50 flex items-center justify-center p-4">
        <Alert className="max-w-md bg-red-50 border-2 border-red-300">
          <AlertCircle className="h-5 w-5 text-red-600" />
          <AlertDescription className="text-red-800 font-semibold text-lg">
            אין לך הרשאות גישה לפאנל הניהול
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="p-3 md:p-6 lg:p-8 bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50 min-h-screen" dir="rtl">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center shadow-lg">
              <Shield className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl md:text-2xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                פאנל ניהול מערכת
              </h1>
              <p className="text-sm text-gray-600">ברוך הבא, {user?.full_name}</p>
            </div>
          </div>
        </div>

        {/* Stats Overview */}
        <StatsOverview />

        {/* Main Tabs */}
        <Tabs defaultValue="winning" className="mt-6">
          <TabsList className="grid w-full grid-cols-3 md:grid-cols-5 bg-white border-2 border-purple-200 shadow-lg h-auto gap-1 p-1">
            <TabsTrigger
              value="winning"
              className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-yellow-500 data-[state=active]:to-amber-500 data-[state=active]:text-white font-semibold py-2 text-sm md:text-base"
            >
              <Trophy className="w-4 h-4 ml-1" />
              <span className="hidden sm:inline">מספרים זוכים</span>
              <span className="sm:hidden">זוכים</span>
            </TabsTrigger>
            <TabsTrigger
              value="lock"
              className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-amber-500 data-[state=active]:to-orange-500 data-[state=active]:text-white font-semibold py-2 text-sm md:text-base"
            >
              <Lock className="w-3 h-3 ml-1" />
              <span className="hidden sm:inline">נעילת טופס</span>
              <span className="sm:hidden">נעילה</span>
            </TabsTrigger>
            <TabsTrigger
              value="publish"
              className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-cyan-500 data-[state=active]:text-white font-semibold py-2 text-sm md:text-base"
            >
              <Eye className="w-3 h-3 ml-1" />
              <span className="hidden sm:inline">פרסום תוצאות</span>
              <span className="sm:hidden">פרסום</span>
            </TabsTrigger>
            <TabsTrigger
              value="submissions"
              className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-500 data-[state=active]:to-pink-500 data-[state=active]:text-white font-semibold py-2 text-sm md:text-base"
            >
              <FileText className="w-3 h-3 ml-1" />
              <span className="hidden sm:inline">דוח שליחות</span>
              <span className="sm:hidden">דוח</span>
            </TabsTrigger>
            <TabsTrigger
              value="users"
              className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-500 data-[state=active]:to-pink-500 data-[state=active]:text-white font-semibold py-2 text-sm md:text-base"
            >
              <Users className="w-3 h-3 ml-1" />
              <span className="hidden sm:inline">ניהול משתמשים</span>
              <span className="sm:hidden">משתמשים</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="winning" className="mt-6">
            <WinningNumbersManager currentAdminId={user?.id} currentAdminName={user?.full_name} />
          </TabsContent>

          <TabsContent value="lock" className="mt-6">
            <FormLockManager currentAdminId={user?.id} currentAdminName={user?.full_name} />
          </TabsContent>

          <TabsContent value="publish" className="mt-6">
            <SelectionsPublishManager currentAdminId={user?.id} currentAdminName={user?.full_name} />
          </TabsContent>

          <TabsContent value="submissions" className="mt-6">
            <SubmissionsReport />
          </TabsContent>

          <TabsContent value="users" className="mt-6">
            <UserManagement currentAdminId={user?.id} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}