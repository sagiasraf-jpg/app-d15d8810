import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Button } from "@/components/ui/button";
import { Trophy } from "lucide-react";

export default function WelcomePage() {
  const navigate = useNavigate();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    document.title = "לוטו שכונתי";
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const authenticated = await base44.auth.isAuthenticated();
      
      if (!authenticated) {
        setIsAuthenticated(false);
        return;
      }
      
      setIsAuthenticated(true);
      const currentUser = await base44.auth.me();
      
      // Log and navigate directly - no approval check
      await base44.auth.updateMe({ last_login: new Date().toISOString() });
      await base44.entities.ActivityLog.create({
        user_id: currentUser.id,
        user_email: currentUser.email,
        user_name: currentUser.full_name,
        action: "login",
        details: "התחברות למערכת"
      });

      // Navigate to Lottery page
      navigate(createPageUrl("Lottery"));
      
    } catch (error) {
      console.error("Error checking auth:", error);
      setIsAuthenticated(false);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogin = () => {
    base44.auth.redirectToLogin(window.location.origin + createPageUrl("Welcome"));
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-gray-300 border-t-gray-600 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">טוען...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-4" dir="rtl">
      <div className="w-full max-w-md">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-100 rounded-full mb-4">
            <Trophy className="w-8 h-8 text-gray-700" />
          </div>

          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            לוטו שכונתי
          </h1>
          <p className="text-base text-gray-600 mb-6">
            מערכת ניהול הגרלות
          </p>

          <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 mb-4">
            <h2 className="text-lg font-semibold text-gray-900 mb-2">
              ברוכים הבאים
            </h2>
            <p className="text-sm text-gray-600">
              התחבר כדי להתחיל למלא טפסי לוטו
            </p>
          </div>

          <Button
            onClick={handleLogin}
            className="w-full h-12 bg-gray-900 hover:bg-gray-800 text-white font-medium text-base"
          >
            כניסה למערכת
          </Button>

          <div className="mt-6 pt-4 border-t border-gray-200">
            <p className="text-xs text-gray-500">
              מערכת פשוטה ונוחה לניהול טפסי לוטו שכונתי
            </p>
          </div>

          <div className="mt-4">
            <p className="text-xs text-gray-400">
              © 2025 לוטו שכונתי - כל הזכויות שמורות
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}