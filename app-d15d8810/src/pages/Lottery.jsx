
import React, { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from "@/utils";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Sparkles, Lock, AlertCircle, Plus, RefreshCw, ChevronDown, ChevronUp, Users, CheckCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { addDays, addWeeks } from "date-fns";

import NumberGrid from "../components/lottery/NumberGrid";
import SelectionHistory from "../components/lottery/SelectionHistory";

export default function LotteryPage() {
  const [user, setUser] = useState(null);
  const [realAdmin, setRealAdmin] = useState(null);
  const [isImpersonating, setIsImpersonating] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [showDeleteSuccess, setShowDeleteSuccess] = useState(false);
  const [showNicknameError, setShowNicknameError] = useState(false); // Added: new state for nickname error
  const [nickname, setNickname] = useState(""); // Changed: single nickname field

  // Editing state
  const [editingSelection, setEditingSelection] = useState(null);

  // Collapsible states - REMOVED: isNicknameOpen

  // ✅ GLOBAL LOCK - blocks ALL form actions
  const [isActuallySubmitting, setIsActuallySubmitting] = useState(false);
  const globalFormLock = useRef(false);
  const lastActionTime = useRef(0);
  const lastClickTimeRef = useRef(0); // Added for debounce on resend

  const queryClient = useQueryClient();
  const navigate = useNavigate();

  useEffect(() => {
    document.title = "טופס לוטו 🎯 | לוטו שכונתי";
    loadUser();
  }, []);

  const loadUser = async () => {
    try {
      // ✅ בדוק אם במצב impersonation
      const impersonatingAs = localStorage.getItem('impersonating_as');
      const impersonatingAdmin = localStorage.getItem('impersonating_admin');

      if (impersonatingAs && impersonatingAdmin) {
        // Load the impersonated user data
        const impersonatedUser = JSON.parse(impersonatingAs);
        setUser(impersonatedUser);
        setRealAdmin(await base44.auth.me()); // Get the real admin's data
        setIsImpersonating(true);
      } else {
        // Normal user
        const currentUser = await base44.auth.me();
        setUser(currentUser);
        setIsImpersonating(false);
      }
    } catch (error) {
      console.error("Error loading user:", error);
      // ✅ במקרה של שגיאה - נקה impersonation ונתק
      localStorage.removeItem('impersonating_as');
      localStorage.removeItem('impersonating_admin');
      // ✅ Redirect למסך Welcome במקרה של שגיאה
      window.location.href = createPageUrl("Welcome");
    }
  };

  const { data: settings } = useQuery({
    queryKey: ['publish-settings-form'],
    queryFn: async () => {
      const result = await base44.entities.PublishSettings.list('-created_date', 1);
      return result[0] || null;
    },
    initialData: null
  });

  // ⭐ NEW: Fetch user payment record
  const { data: userPaymentRecord } = useQuery({
    queryKey: ['user-payment-record', user?.email],
    queryFn: async () => {
      if (!user?.email) return null;
      const records = await base44.entities.UserPaymentRecord.filter({ user_email: user.email });
      return records[0] || null;
    },
    enabled: !!user?.email,
    initialData: null
  });

  // ⭐ Calculate unpaid forms count
  const unpaidFormsCount = userPaymentRecord ?
  userPaymentRecord.total_forms_submitted - userPaymentRecord.paid_forms :
  0;

  const { data: allSelections, isLoading: isLoadingSelections } = useQuery({
    queryKey: ['selections', user?.email],
    queryFn: async () => {
      if (!user?.email) return [];
      // טוען את כל הבחירות (כולל show_in_history: false) לצורך בדיקת כפילויות
      return await base44.entities.LotterySelection.filter(
        { user_email: user.email },
        '-created_date',
        100
      );
    },
    enabled: !!user?.email,
    initialData: []
  });

  // סינון רק הבחירות שצריך להציג בהיסטוריה
  const selections = allSelections.filter((s) => s.show_in_history !== false);

  // Get unique nicknames from selections
  const existingNicknames = [...new Set(selections.map((s) => s.nickname).filter(Boolean))];

  const createSelectionMutation = useMutation({
    mutationFn: async ({ numbers, nickname }) => {
      // ULTRA-STRICT blocking
      const now = Date.now();
      if (globalFormLock.current || now - lastActionTime.current < 6000) {
        throw new Error("BLOCKED_BY_RATE_LIMIT");
      }

      globalFormLock.current = true;
      lastActionTime.current = now;
      setIsActuallySubmitting(true);

      // Check for duplicate submission in the last 30 seconds
      const thirtySecondsAgo = new Date(now - 30000);
      const recentDuplicate = allSelections.some((selection) => {
        const selectionDate = new Date(selection.created_date);
        const isSameNickname = selection.nickname === nickname;
        const isSameNumbers = selection.numbers.length === numbers.length &&
        selection.numbers.every((num) => numbers.includes(num));
        const isRecent = selectionDate >= thirtySecondsAgo;
        return isSameNickname && isSameNumbers && isRecent;
      });

      if (recentDuplicate) {
        throw new Error("DUPLICATE_SUBMISSION");
      }

      const editUntil = addDays(new Date(), 1).toISOString();

      await base44.entities.LotterySelection.create({
        numbers: numbers,
        user_email: user.email,
        user_name: user.full_name || user.display_name,
        nickname: nickname,
        draw_date: new Date().toISOString().split('T')[0],
        is_published: false,
        edit_until: editUntil,
        is_recurring: false,
        recurrence_weeks: null,
        recurrence_end_date: null,
        color_tag: "green",
        show_in_history: true
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['selections'] });
      queryClient.invalidateQueries({ queryKey: ['user-payment-record'] }); // Invalidate payment record on success
      setShowSuccess(true);
      setNickname(""); // Clear nickname after successful submission

      // Release lock after 6 seconds
      setTimeout(() => {
        globalFormLock.current = false;
        setIsActuallySubmitting(false);
      }, 6000);
    },
    onError: (error) => {
      console.error("Error creating selection:", error);

      // Release immediately on error
      globalFormLock.current = false;
      setIsActuallySubmitting(false);

      if (error.message === "DUPLICATE_SUBMISSION") {
        alert("⚠️ הטופס כבר נשלח! אנא המתן מספר שניות לפני שליחה נוספת.");
      } else if (error.message === "BLOCKED_BY_RATE_LIMIT") {
        alert("⏳ אנא המתן מספר שניות לפני פעולה נוספת");
      } else {
        alert("שגיאה בשמירת הבחירה. נסה שוב.");
      }
    }
  });

  const updateSelectionMutation = useMutation({
    mutationFn: async ({ selectionId, numbers, nickname }) => {
      // Check global lock
      if (globalFormLock.current) {
        throw new Error("BLOCKED_BY_RATE_LIMIT");
      }

      await base44.entities.LotterySelection.update(selectionId, {
        numbers: numbers,
        nickname: nickname
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['selections'] });
      queryClient.invalidateQueries({ queryKey: ['user-payment-record'] }); // Invalidate payment record on success
      setEditingSelection(null);
      setNickname(""); // Clear nickname after update
      setShowSuccess(true);
    },
    onError: (error) => {
      console.error("Error updating selection:", error);
      if (error.message === "BLOCKED_BY_RATE_LIMIT") {
        alert("⏳ אנא המתן מספר שניות לפני פעולה נוספת");
      } else {
        alert("שגיאה בעדכון הבחירה. נסה שוב.");
      }
    }
  });

  const deleteSelectionMutation = useMutation({
    mutationFn: async (selectionId) => {
      // Check global lock
      if (globalFormLock.current) {
        throw new Error("BLOCKED_BY_RATE_LIMIT");
      }

      try {
        await base44.entities.LotterySelection.delete(selectionId);
      } catch (error) {
        if (error.message && error.message.includes('not found')) {
          console.log("Selection already deleted, refreshing list");
        } else {
          throw error;
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['selections'] });
      queryClient.invalidateQueries({ queryKey: ['user-payment-record'] }); // Invalidate payment record on success
      setShowDeleteSuccess(true);
      // Original: setTimeout(() => setShowDeleteSuccess(false), 3000); -- Removed for modal behavior
    },
    onError: (error) => {
      console.error("Error deleting selection:", error);
      queryClient.invalidateQueries({ queryKey: ['selections'] });
      if (error.message === "BLOCKED_BY_RATE_LIMIT") {
        alert("⏳ אנא המתן מספר שניות לפני פעולה נוספת");
      } else {
        alert("שגיאה במחיקת הבחירה.");
      }
    }
  });

  const handleSubmitNumbers = async (numbers) => {
    // Validate nickname
    if (!nickname.trim()) {
      setShowNicknameError(true); // Changed: Show nickname error modal
      return;
    }

    if (editingSelection) {
      // Update existing selection
      await updateSelectionMutation.mutateAsync({
        selectionId: editingSelection.id,
        numbers,
        nickname: nickname.trim()
      });
    } else {
      // Create new selection
      await createSelectionMutation.mutateAsync({
        numbers,
        nickname: nickname.trim()
      });
    }
  };

  const handleResendNumbers = async (numbers, nickname) => {
    const now = Date.now();

    // ✅ ULTRA-AGGRESSIVE: 2 second debounce between clicks
    if (now - lastClickTimeRef.current < 2000) {
      console.log("🔒 BLOCKED: Click too fast (debounce)");
      return;
    }
    lastClickTimeRef.current = now;

    // ✅ CHECK GLOBAL LOCK
    if (globalFormLock.current) {
      console.log("🔒 BLOCKED: Global lock active");
      alert("⏳ הטופס נעול זמנית. אנא המתן.");
      return;
    }

    // ✅ רענן את הנתונים לפני הבדיקה כדי לוודא שיש לנו את המידע העדכני ביותר
    await queryClient.invalidateQueries({ queryKey: ['selections'] });
    await queryClient.refetchQueries({ queryKey: ['selections'] });

    // ⏳ המתן רגע קצר לוודא שהנתונים התעדכנו
    await new Promise((resolve) => setTimeout(resolve, 200));

    // ✅ קבל את הנתונים העדכניים ביותר מה-cache
    const currentSelections = queryClient.getQueryData(['selections', user?.email]) || [];

    // ✅ NEW LOGIC: בדוק אם יש טופס ירוק עבור הכינוי הזה (שלא נמחק על ידי מנהל)
    const hasGreenForm = currentSelections.some((selection) => {
      const isSameNickname = selection.nickname === nickname;
      const isGreen = selection.color_tag === "green";
      const notDeleted = selection.deleted_by_admin !== true;
      return isSameNickname && isGreen && notDeleted;
    });

    console.log(`🔍 Checking green forms for "${nickname}": ${hasGreenForm ? "Found green form" : "No green forms"}`);

    if (hasGreenForm) {
      // יש טופס ירוק - חסום "שלח שוב"
      console.log("🚫 BLOCKED: Green form exists for this nickname");
      alert(`⚠️ לא ניתן לשלוח שוב!\n\nקיים טופס ירוק עבור הכינוי "${nickname}".\n\n💡 ניתן להשתמש ב"שלח שוב" רק כאשר הטופס הופך לאדום בפאנל הניהול.`);
      return;
    }

    // ✅ נעל מיידית
    globalFormLock.current = true;
    lastActionTime.current = now;
    setIsActuallySubmitting(true);

    console.log("🔓 ALLOWED: Starting resend (no green forms found)");

    try {
      // יצירת רשומה חדשה ב-API
      await base44.entities.LotterySelection.create({
        numbers,
        user_email: user.email,
        user_name: user.full_name || user.display_name,
        nickname,
        draw_date: new Date().toISOString().split('T')[0],
        is_published: false,
        edit_until: addDays(new Date(), 1).toISOString(),
        is_recurring: false,
        color_tag: "green",
        show_in_history: true
      });

      console.log("✅ Resend successful");

      // ✅ חשוב: רענן את הבחירות כדי לראות את הרשומה החדשה
      await queryClient.invalidateQueries({ queryKey: ['selections'] });
      await queryClient.invalidateQueries({ queryKey: ['user-payment-record'] }); // Invalidate payment record on resend
      await queryClient.refetchQueries({ queryKey: ['selections'] });

    } catch (error) {
      console.error("❌ Resend error:", error);
      alert("❌ שגיאה בשליחה חוזרת");
      // שחרר מיידית במצב של שגיאה
      globalFormLock.current = false;
      setIsActuallySubmitting(false);
      throw error;
    } finally {
      // ✅ שמור על נעילה למשך 6 שניות מינימום
      setTimeout(() => {
        globalFormLock.current = false;
        setIsActuallySubmitting(false);
        console.log("🔓 Lock released after 6s");
      }, 6000);
    }
  };

  const handleDeleteSelection = async (selectionId) => {
    await deleteSelectionMutation.mutateAsync(selectionId);
  };

  const handleEditSelection = (selection) => {
    setEditingSelection(selection);
    setNickname(selection.nickname); // Changed from setSelectedNickname
    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCancelEdit = () => {
    setEditingSelection(null);
    setNickname(""); // Changed from setSelectedNickname
  };

  const handleNavigateToAllResults = () => {
    navigate(createPageUrl("AllResults"));
  };

  const isFormLocked = settings?.is_form_open === false;

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-100 via-purple-50 to-purple-100 flex items-center justify-center">
        <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-gray-600 text-lg">טוען...</p>
      </div>);

  }

  return (
    <div className="p-2 sm:p-4 md:p-6 lg:p-8 bg-gradient-to-br from-purple-100 via-purple-50 to-purple-100 min-h-screen">
      <div className="max-w-7xl mx-auto">
        {/* Success Message - CENTER SCREEN - RESPONSIVE */}
        <AnimatePresence>
          {showSuccess &&
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-2 sm:p-4"
            onClick={() => setShowSuccess(false)}>

              <motion.div
              initial={{ y: -50 }}
              animate={{ y: 0 }}
              exit={{ y: 50 }}
              className="bg-white rounded-xl sm:rounded-2xl shadow-2xl p-3 sm:p-5 md:p-6 max-w-[90%] sm:max-w-md w-full border-2 sm:border-4 border-green-400"
              onClick={(e) => e.stopPropagation()}>

                <div className="text-center">
                  <div className="w-10 h-10 sm:w-14 sm:h-14 md:w-16 sm:h-16 bg-gradient-to-br from-green-400 to-emerald-500 rounded-full flex items-center justify-center mx-auto mb-2 sm:mb-3 md:mb-4 animate-bounce">
                    <CheckCircle className="w-5 h-5 sm:w-7 sm:h-7 md:w-10 md:h-10 text-white" />
                  </div>
                  <h3 className="text-base sm:text-lg md:text-xl font-black text-gray-900 mb-1 sm:mb-2">
                    {editingSelection ? "הבחירה עודכנה!" : "טופס נשלח בהצלחה!"}
                  </h3>
                  <p className="text-xs sm:text-sm md:text-base text-gray-600 mb-2 sm:mb-3 md:mb-4">
                    {editingSelection ? "השינויים נשמרו במערכת 🎉" : "המספרים שלך נשמרו במערכת 🎉"}
                  </p>
                  <Button
                  onClick={() => setShowSuccess(false)}
                  className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white font-bold px-4 sm:px-6 md:px-8 py-2 text-xs sm:text-sm md:text-base h-9 sm:h-10 md:h-11">

                    סגור
                  </Button>
                </div>
              </motion.div>
            </motion.div>
          }
        </AnimatePresence>

        {/* Delete Success Message - CENTER SCREEN - RESPONSIVE */}
        <AnimatePresence>
          {showDeleteSuccess &&
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-2 sm:p-4"
            onClick={() => setShowDeleteSuccess(false)}>

              <motion.div
              initial={{ y: -50 }}
              animate={{ y: 0 }}
              exit={{ y: 50 }}
              className="bg-white rounded-xl sm:rounded-2xl shadow-2xl p-3 sm:p-5 md:p-6 max-w-[90%] sm:max-w-md w-full border-2 sm:border-4 border-blue-400"
              onClick={(e) => e.stopPropagation()}>

                <div className="text-center">
                  <div className="w-10 h-10 sm:w-14 sm:h-14 md:w-16 sm:h-16 bg-gradient-to-br from-blue-400 to-cyan-500 rounded-full flex items-center justify-center mx-auto mb-2 sm:mb-3 md:mb-4">
                    <CheckCircle className="w-5 h-5 sm:w-7 sm:h-7 md:w-10 md:h-10 text-white" />
                  </div>
                  <h3 className="text-base sm:text-lg md:text-xl font-black text-gray-900 mb-1 sm:mb-2">
                    הבחירה נמחקה!
                  </h3>
                  <p className="text-xs sm:text-sm md:text-base text-gray-600 mb-2 sm:mb-3 md:mb-4">
                    הבחירה הוסרה בהצלחה מההיסטוריה 🗑️
                  </p>
                  <Button
                  onClick={() => setShowDeleteSuccess(false)}
                  className="bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white font-bold px-4 sm:px-6 md:px-8 py-2 text-xs sm:text-sm md:text-base h-9 sm:h-10 md:h-11">

                    סגור
                  </Button>
                </div>
              </motion.div>
            </motion.div>
          }
        </AnimatePresence>

        {/* Nickname Error Message - CENTER SCREEN - RESPONSIVE */}
        <AnimatePresence>
          {showNicknameError &&
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-2 sm:p-4"
            onClick={() => setShowNicknameError(false)}>

              <motion.div
              initial={{ y: -50 }}
              animate={{ y: 0 }}
              exit={{ y: 50 }}
              className="bg-white rounded-xl sm:rounded-2xl shadow-2xl p-3 sm:p-5 md:p-6 max-w-[90%] sm:max-w-md w-full border-2 sm:border-4 border-orange-400"
              onClick={(e) => e.stopPropagation()}>

                <div className="text-center">
                  <div className="w-10 h-10 sm:w-14 sm:h-14 md:w-16 sm:h-16 bg-gradient-to-br from-orange-400 to-red-500 rounded-full flex items-center justify-center mx-auto mb-2 sm:mb-3 md:mb-4">
                    <AlertCircle className="w-5 h-5 sm:w-7 sm:h-7 md:w-10 md:h-10 text-white" />
                  </div>
                  <h3 className="text-base sm:text-lg md:text-xl font-black text-gray-900 mb-1 sm:mb-2">
                    ⚠️ חסר כינוי
                  </h3>
                  <p className="text-xs sm:text-sm md:text-base text-gray-600 mb-2 sm:mb-3 md:mb-4">
                    נא להזין כינוי לפני שליחת המספרים
                  </p>
                  <Button
                  onClick={() => setShowNicknameError(false)}
                  className="bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white font-bold px-4 sm:px-6 md:px-8 py-2 text-xs sm:text-sm md:text-base h-9 sm:h-10 md:h-11">

                    הבנתי
                  </Button>
                </div>
              </motion.div>
            </motion.div>
          }
        </AnimatePresence>

        {/* Mobile "All Results" Button - Top */}
        <div className="lg:hidden mb-2">
          <Button
            onClick={handleNavigateToAllResults}
            size="sm"
            className="w-full bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white font-semibold text-xs sm:text-sm h-9 sm:h-10">

            <Users className="w-3 h-3 sm:w-4 sm:h-4 ml-1" />
            כל התוצאות 🏆
          </Button>
        </div>

        {/* Impersonation Notice */}
        {isImpersonating &&
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-3 sm:mb-4">

            <Alert className="bg-amber-100 border-2 border-amber-400 shadow-lg">
              <AlertCircle className="h-4 w-4 sm:h-5 sm:w-5 text-amber-700" />
              <AlertDescription className="text-amber-900 font-semibold text-xs sm:text-sm md:text-base">
                🔍 <strong>מצב צפייה:</strong> אתה צופה ומבצע פעולות בשם המשתמש <strong>{user.display_name || user.full_name}</strong>
              </AlertDescription>
            </Alert>
          </motion.div>
        }

        {isFormLocked &&
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-3 sm:mb-4">

            <Card className="border-2 border-red-300 shadow-2xl bg-red-50">
              <CardHeader className="bg-gradient-to-r from-red-100 to-orange-100 border-b-2 border-red-200 p-3 sm:p-4">
                <CardTitle className="text-center text-base sm:text-lg md:text-xl text-red-900 flex items-center justify-center gap-2">
                  <Lock className="w-5 h-5 sm:w-6 sm:h-6 md:w-7 md:h-7" />
                  הטופס נעול 🔒
                </CardTitle>
              </CardHeader>
              <CardContent className="p-3 sm:p-4 md:p-6">
                <Alert className="bg-white border-red-300">
                  <AlertCircle className="h-4 w-4 sm:h-5 w-5 text-red-600" />
                  <AlertDescription className="text-red-900">
                    <p className="font-bold text-sm sm:text-base md:text-lg mb-2">⏰ לא ניתן למלא את הטופס כרגע</p>
                    <p className="text-xs sm:text-sm text-gray-500 mt-2">
                      💡 המנהל יפתח את הטופס מחדש כשיהיה ניתן למלא
                    </p>
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>
          </motion.div>
        }

        <div className="grid lg:grid-cols-3 gap-3 sm:gap-4 md:gap-6 mt-3 sm:mt-4 pb-16 sm:pb-20 lg:pb-6">
          <div className="lg:col-span-2 space-y-3 sm:space-y-4">
            {isFormLocked && !editingSelection ?
            <Card className="bg-white shadow-xl border-2 border-gray-300 opacity-60">
                <CardHeader className="bg-gradient-to-r from-gray-100 to-gray-200 text-gray-700 rounded-t-lg p-3 sm:p-4">
                  <CardTitle className="flex items-center gap-2 text-base sm:text-lg md:text-xl justify-center">
                    <Lock className="w-5 h-5 sm:w-6 sm:w-6" />
                    <span>טופס לוטו - סגור 🔒</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4 sm:p-6 text-center">
                  <Lock className="w-16 h-16 sm:w-20 sm:h-20 text-gray-400 mx-auto mb-3" />
                  <p className="text-base sm:text-lg text-gray-600 font-bold">הטופס אינו פעיל כרגע</p>
                  <p className="text-xs sm:text-sm text-gray-500 mt-2">המנהל יפתח אותו בקרוב</p>
                </CardContent>
              </Card> :

            <>
                {/* Nickname Input - Simple Text Field */}
                {!editingSelection &&
              <Card className="bg-gradient-to-br from-purple-50 to-pink-50 border-2 border-purple-300 shadow-lg">
                    <CardHeader className="bg-gradient-to-r from-purple-100 to-pink-100 border-b-2 border-purple-200 p-4 md:p-5">
                      <CardTitle className="text-purple-900 text-lg md:text-xl">
                        הזן כינוי לתור
                      </CardTitle>
                    </CardHeader>
                    
                    <CardContent className="p-4 md:p-5 space-y-4">
                      <div className="space-y-3">
                        <Label className="text-gray-700 font-bold text-base">כינוי לתור:</Label>
                        <Input
                      value={nickname}
                      onChange={(e) => setNickname(e.target.value)}
                      placeholder="למשל: יוסי, אמא, אבא..."
                      className="border-2 border-purple-300 focus:border-purple-500 text-lg h-14" />

                      </div>

                      {nickname.trim() &&
                  <div className="bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-300 rounded-lg p-4">
                          <p className="text-green-800 font-bold text-center text-lg">
                            ✓ כינוי: <span className="text-xl">{nickname.trim()}</span>
                          </p>
                        </div>
                  }
                    </CardContent>
                  </Card>
              }

                <NumberGrid
                user={user}
                onSubmit={handleSubmitNumbers}
                isSubmitting={createSelectionMutation.isPending || updateSelectionMutation.isPending}
                canSubmit={!!nickname.trim() || !!editingSelection}
                editingSelection={editingSelection}
                onCancelEdit={handleCancelEdit} />

              </>
            }
          </div>

          <div className="lg:col-span-1 space-y-3 sm:space-y-4">
            {/* ⭐ NEW: Payment Alert - Show only if unpaidFormsCount > 0 */}
            {unpaidFormsCount > 0 &&
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-4 bg-gradient-to-r from-red-50 to-orange-50 border-2 border-red-400 rounded-xl shadow-lg">

                <div className="text-center">
                  <p className="text-sm sm:text-base font-bold text-red-800 mb-2">מספר

                </p>
                  <p className="text-[#0056eb] text-4xl font-black sm:text-5xl">
                    {unpaidFormsCount}
                  </p>
                  <p className="text-xs sm:text-sm text-red-700 mt-1">

                </p>
                </div>
              </motion.div>
            }

            <SelectionHistory
              selections={allSelections}
              isLoading={isLoadingSelections}
              onResendNumbers={isFormLocked ? null : handleResendNumbers}
              onDeleteSelection={handleDeleteSelection}
              onEditSelection={isFormLocked ? null : handleEditSelection}
              isDeletingSelection={deleteSelectionMutation.isPending}
              isGloballyLocked={globalFormLock.current || isActuallySubmitting} />

          </div>
        </div>
      </div>
    </div>);

}