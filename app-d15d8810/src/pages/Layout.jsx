

import React, { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
import { Trophy, LayoutDashboard, User as UserIcon, LogOut, Sparkles, Shield, RefreshCw, Users, UserCog, LogIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { Badge } from "@/components/ui/badge";

export default function Layout({ children, currentPageName }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [impersonatedUser, setImpersonatedUser] = useState(null);
  const [isImpersonating, setIsImpersonating] = useState(false);

  useEffect(() => {
    loadUser();
    checkImpersonation();
  }, []);

  const loadUser = async () => {
    try {
      const currentUser = await base44.auth.me();
      setUser(currentUser);
    } catch (error) {
      console.error("Error loading user:", error);
      const impersonatingAs = localStorage.getItem('impersonating_as');
      const impersonatingAdmin = localStorage.getItem('impersonating_admin');
      
      if (impersonatingAs && impersonatingAdmin) {
        localStorage.removeItem('impersonating_as');
        localStorage.removeItem('impersonating_admin');
        window.location.reload();
      }
    }
    setIsLoading(false);
  };

  const checkImpersonation = () => {
    const impersonatingAs = localStorage.getItem('impersonating_as');
    const impersonatingAdmin = localStorage.getItem('impersonating_admin');
    
    if (impersonatingAs && impersonatingAdmin) {
      setImpersonatedUser(JSON.parse(impersonatingAs));
      setIsImpersonating(true);
    }
  };

  const handleExitImpersonation = async () => {
    const adminUser = JSON.parse(localStorage.getItem('impersonating_admin'));
    localStorage.removeItem('impersonating_as');
    localStorage.removeItem('impersonating_admin');
    
    try {
      if (adminUser) {
        await base44.entities.ActivityLog.create({
          user_id: adminUser.id,
          user_email: adminUser.email,
          user_name: adminUser.full_name,
          action: "impersonation_exit",
          details: `יציאה ממצב "כניסה כמשתמש" מהמשתמש ${impersonatedUser?.email || ''}`
        });
      }
    } catch (error) {
      console.error("Error logging activity:", error);
    }

    window.location.reload();
  };

  const handleRefreshUser = async () => {
    setIsRefreshing(true);
    await loadUser();
    setIsRefreshing(false);
    window.location.reload();
  };

  const handleLogout = async () => {
    try {
      localStorage.removeItem('impersonating_as');
      localStorage.removeItem('impersonating_admin');
      
      if (user) {
        try {
          await base44.entities.ActivityLog.create({
            user_id: user.id,
            user_email: user.email,
            user_name: user.full_name,
            action: "logout",
            details: "התנתקות מהמערכת"
          });
        } catch (logError) {
          console.error("Error logging activity:", logError);
        }
      }
    } catch (error) {
      console.error("Error in logout process:", error);
    }
    
    try {
      await base44.auth.logout();
    } catch (logoutError) {
      console.error("Error during logout:", logoutError);
    }
    
    setTimeout(() => {
      window.location.href = createPageUrl("Welcome");
    }, 100);
  };

  const isAdmin = user?.role === "admin";

  const userNavItems = [
    {
      title: "טופס לוטו",
      url: createPageUrl("Lottery"),
      icon: Trophy,
    },
    {
      title: "כל התוצאות",
      url: createPageUrl("AllResults"),
      icon: Users,
    },
  ];

  const adminNavItems = [
    {
      title: "פאנל ניהול",
      url: createPageUrl("AdminDashboard"),
      icon: Shield,
    },
  ];

  const getDisplayName = () => {
    if (isImpersonating && impersonatedUser) {
      return impersonatedUser.display_name || impersonatedUser.full_name || impersonatedUser.nickname || "משתמש";
    }
    return user?.display_name || user?.full_name || user?.nickname || "משתמש";
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-sky-50 to-cyan-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 text-lg">טוען...</p>
        </div>
      </div>
    );
  }

  if (currentPageName === "Welcome" || !user) {
    return children;
  }

  return (
    <SidebarProvider>
      <style>{`
        /* 🔥 SUPER AGGRESSIVE - מחיקה טוטלית של ה-spacer */
        
        /* תופס כל דיב עם data-source-location שמכיל sidebar */
        div[data-source-location*="sidebar"][class*="relative"][class*="h-svh"] {
          display: none !important;
          width: 0 !important;
          height: 0 !important;
          opacity: 0 !important;
          visibility: hidden !important;
          position: absolute !important;
          left: -9999px !important;
        }
        
        /* תופס את ה-spacer הספציפי */
        div[class*="h-svh"][class*="w-[--sidebar-width]"][class*="bg-transparent"] {
          display: none !important;
        }
        
        /* תופס כל sibling של sidebar */
        aside[data-sidebar="sidebar"] + div,
        aside[data-sidebar="sidebar"] ~ div.relative {
          display: none !important;
        }
        
        /* תופס לפי המבנה המדויק */
        [data-sidebar-provider] > div > aside + div {
          display: none !important;
        }
      `}</style>
      <div className="min-h-screen flex w-full bg-gradient-to-br from-blue-50 via-sky-50 to-cyan-50" dir="rtl">
        {isImpersonating && impersonatedUser && (
          <div className="fixed top-0 left-0 right-0 z-50 bg-gradient-to-r from-amber-500 to-orange-500 text-white py-2 sm:py-3 px-2 sm:px-4 shadow-2xl border-b-2 sm:border-b-4 border-amber-700">
            <div className="max-w-7xl mx-auto flex items-center justify-between flex-col sm:flex-row gap-2">
              <div className="flex items-center gap-2 sm:gap-3">
                <UserCog className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 animate-pulse" />
                <div>
                  <p className="font-bold text-xs sm:text-sm md:text-base lg:text-lg">
                    ⚠️ מצב צפייה: אתה צופה במערכת כמשתמש
                  </p>
                  <p className="text-xs sm:text-sm">
                    צופה כ: <strong>{impersonatedUser.display_name || impersonatedUser.full_name}</strong> ({impersonatedUser.email})
                  </p>
                </div>
              </div>
              <Button
                onClick={handleExitImpersonation}
                className="bg-white text-amber-700 hover:bg-amber-50 font-bold shadow-lg text-xs sm:text-sm h-8 sm:h-9 md:h-10"
              >
                <LogIn className="w-3 h-3 sm:w-4 sm:h-4 ml-2" />
                חזור למשתמש שלי
              </Button>
            </div>
          </div>
        )}

        {/* Sidebar - Hidden on mobile */}
        <Sidebar className="hidden md:flex border-l border-blue-200 bg-white/80 backdrop-blur-sm z-40">
          <SidebarHeader className="border-b border-blue-200 p-4 bg-gradient-to-r from-blue-50 to-sky-50">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 via-sky-500 to-cyan-500 rounded-xl flex items-center justify-center shadow-lg">
                  <Trophy className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2 className="font-bold text-gray-900 flex items-center gap-2">
                    לוטו שכונתי
                    {isAdmin && (
                      <Badge className="bg-gradient-to-r from-purple-500 to-pink-500 text-white text-xs">
                        Admin
                      </Badge>
                    )}
                  </h2>
                  <p className="text-xs text-gray-500">מערכת הגרלות</p>
                </div>
              </div>
              <div className="hidden md:block">
                <SidebarTrigger className="hover:bg-blue-100 p-2 rounded-lg transition-colors duration-200" />
              </div>
            </div>
          </SidebarHeader>
          
          <SidebarContent className="p-2">
            <SidebarGroup>
              <SidebarGroupLabel className="text-xs font-medium text-gray-500 uppercase tracking-wider px-2 py-2">
                תפריט ראשי
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {userNavItems.map((item) => (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton 
                        asChild 
                        className={`hover:bg-blue-50 hover:text-blue-700 transition-colors duration-200 rounded-lg mb-1 ${
                          location.pathname === item.url ? 'bg-blue-50 text-blue-700 font-semibold' : ''
                        }`}
                      >
                        <Link to={item.url} className="flex items-center gap-3 px-3 py-2">
                          <item.icon className="w-4 h-4" />
                          <span>{item.title}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>

            {isAdmin && (
              <SidebarGroup>
                <SidebarGroupLabel className="text-xs font-medium text-purple-600 uppercase tracking-wider px-2 py-2 flex items-center gap-2">
                  <Shield className="w-3 h-3" />
                  ניהול מערכת
                </SidebarGroupLabel>
                <SidebarGroupContent>
                  <SidebarMenu>
                    {adminNavItems.map((item) => (
                      <SidebarMenuItem key={item.title}>
                        <SidebarMenuButton 
                          asChild 
                          className={`hover:bg-purple-50 hover:text-purple-700 transition-colors duration-200 rounded-lg mb-1 ${
                            location.pathname === item.url ? 'bg-purple-50 text-purple-700 font-semibold' : ''
                          }`}
                        >
                          <Link to={item.url} className="flex items-center gap-3 px-3 py-2">
                            <item.icon className="w-4 h-4" />
                            <span>{item.title}</span>
                          </Link>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    ))}
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
            )}

            {isAdmin && (
              <SidebarGroup>
                <SidebarGroupContent>
                  <div className="px-2 mt-4">
                    <Button
                      onClick={handleRefreshUser}
                      disabled={isRefreshing}
                      variant="outline"
                      size="sm"
                      className="w-full border-2 border-blue-300 text-blue-700 hover:bg-blue-50"
                    >
                      {isRefreshing ? (
                        <>
                          <div className="w-3 h-3 border-2 border-blue-700 border-t-transparent rounded-full animate-spin ml-2" />
                          מרענן...
                        </>
                      ) : (
                        <>
                          <RefreshCw className="w-3 h-3 ml-2" />
                          רענן תפקיד
                        </>
                      )}
                    </Button>
                    <p className="text-xs text-gray-500 mt-2 text-center">
                      לחץ אם שונה תפקידך
                    </p>
                  </div>
                </SidebarGroupContent>
              </SidebarGroup>
            )}
          </SidebarContent>

          <SidebarFooter className="border-t border-blue-200 p-4 bg-gradient-to-r from-blue-50 to-sky-50">
            {isImpersonating && impersonatedUser && (
              <div className="mb-3 bg-amber-100 border-2 border-amber-400 rounded-lg p-3">
                <p className="text-xs font-bold text-amber-900 mb-1">🔍 מצב צפייה</p>
                <p className="text-xs text-amber-800">
                  צופה כ: <strong>{impersonatedUser.display_name || impersonatedUser.full_name}</strong>
                </p>
                <Button
                  onClick={handleExitImpersonation}
                  size="sm"
                  className="w-full mt-2 bg-amber-600 hover:bg-amber-700 text-white"
                >
                  <LogIn className="w-3 h-3 ml-1" />
                  חזור למשתמש שלי
                </Button>
              </div>
            )}

            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-cyan-400 rounded-full flex items-center justify-center shadow-md">
                  <span className="text-white font-bold text-sm">
                    {getDisplayName().charAt(0) || "U"}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900 text-sm truncate">
                    {getDisplayName()}
                  </p>
                  <p className="text-xs text-gray-500 truncate">
                    {isImpersonating && impersonatedUser ? impersonatedUser.email : user?.email}
                  </p>
                  <p className="text-xs text-purple-600 font-semibold">
                    {isAdmin ? "מנהל מערכת" : "משתמש רגיל"}
                  </p>
                </div>
              </div>
              <Button
                onClick={handleLogout}
                variant="outline"
                size="sm"
                className="w-full border-2 border-blue-300 text-blue-700 hover:bg-blue-50"
              >
                <LogOut className="w-4 h-4 ml-2" />
                התנתק
              </Button>
            </div>
          </SidebarFooter>
        </Sidebar>

        <main className={`flex-1 flex flex-col ${isImpersonating ? 'mt-[60px] sm:mt-[76px]' : ''}`}>
          {/* Header - Hidden on mobile */}
          <header className={`hidden md:block bg-white/80 backdrop-blur-sm border-b border-blue-200 px-2 sm:px-3 md:px-4 py-2 sm:py-3 shadow-sm ${isImpersonating ? 'mt-[60px] sm:mt-[76px]' : ''} z-30`}>
            <div className="flex items-center gap-2 sm:gap-4">
              <SidebarTrigger className="md:hover:bg-blue-100 p-1.5 sm:p-2 rounded-lg md:transition-colors md:duration-200" />
              <div className="flex items-center gap-1 sm:gap-2 md:hidden">
                <Trophy className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 text-blue-600" />
                <h1 className="text-sm sm:text-base md:text-lg font-bold text-gray-900">לוטו שכונתי</h1>
              </div>
            </div>
          </header>

          <div className="flex-1 overflow-auto">
            {children}
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
}

