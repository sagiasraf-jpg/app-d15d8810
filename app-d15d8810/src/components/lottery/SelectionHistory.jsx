
import React, { useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { History, Calendar, Clock, Send, Trash2, User, Edit2, RefreshCw, ChevronDown, ChevronUp, CheckCircle, AlertCircle } from "lucide-react";
import { parseISO, subDays } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";

export default function SelectionHistory({ 
  selections = [], 
  isLoading = false, 
  onResendNumbers = null, 
  onDeleteSelection = null, 
  onEditSelection = null,
  isDeletingSelection = false,
  isGloballyLocked = false
}) {
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectionToDelete, setSelectionToDelete] = useState(null);
  const [isOpen, setIsOpen] = useState(false);
  const [showResendSuccess, setShowResendSuccess] = useState(false);
  const [showMaxReachedAlert, setShowMaxReachedAlert] = useState(false);
  const [maxReachedNickname, setMaxReachedNickname] = useState("");
  const lastClickTimeRef = useRef(0);

  const handleDeleteClick = (selection) => {
    setSelectionToDelete(selection);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = () => {
    if (selectionToDelete && onDeleteSelection) {
      onDeleteSelection(selectionToDelete.id);
    }
    setDeleteDialogOpen(false);
    setSelectionToDelete(null);
  };

  const handleCancelDelete = () => {
    setDeleteDialogOpen(false);
    setSelectionToDelete(null);
  };

  // Check if can edit (within 24 hours)
  const canEdit = (selection) => {
    if (!selection.edit_until) return false;
    const now = new Date();
    const editUntil = parseISO(selection.edit_until);
    return now <= editUntil;
  };

  const handleResend = async (numbers, nickname) => {
    const now = Date.now();
    
    // ✅ ULTRA-AGGRESSIVE: 2 second debounce between clicks
    if (now - lastClickTimeRef.current < 2000) {
      console.log("🔒 BLOCKED: Click too fast (debounce)");
      return;
    }
    lastClickTimeRef.current = now;
    
    // ✅ CHECK GLOBAL LOCK
    if (isGloballyLocked) {
      console.log("🔒 BLOCKED: Global lock active");
      return; 
    }
    
    try {
      // ✅ NEW LOGIC: בדוק אם יש טופס ירוק עבור הכינוי הזה (שלא נמחק על ידי מנהל)
      const hasGreenForm = selections.some(selection => {
        const isSameNickname = selection.nickname === nickname;
        const isGreen = selection.color_tag === "green";
        const notDeleted = selection.deleted_by_admin !== true;
        return isSameNickname && isGreen && notDeleted;
      });

      console.log(`🔍 [History] Checking green forms for "${nickname}": ${hasGreenForm ? "Found green form" : "No green forms"}`);

      // אם יש טופס ירוק - חסום עם התראה במרכז המסך
      if (hasGreenForm) {
        console.log("🚫 [History] BLOCKED: Green form exists");
        setMaxReachedNickname(nickname);
        setShowMaxReachedAlert(true);
        return;
      }

      // בפועל שלח את המספרים באמצעות ה-handler של ההורה
      if (onResendNumbers) {
        await onResendNumbers(numbers, nickname);
        
        // הצג הודעת הצלחה למשך 2 שניות
        setShowResendSuccess(true);
        setTimeout(() => setShowResendSuccess(false), 2000);
      }
    } catch (error) {
      console.error("❌ Error in handleResend:", error);
      // אל תציג alert כאן - ה-handler של ההורה כבר מציג שגיאה
    } 
  };

  // Filter only last week AND show_in_history = true AND not deleted by admin
  const oneWeekAgo = subDays(new Date(), 7);
  const recentSelections = Array.isArray(selections) ? selections.filter(selection => {
    const createdDate = parseISO(selection.created_date);
    const isRecent = createdDate >= oneWeekAgo;
    const shouldShow = selection.show_in_history !== false;
    const notDeletedByAdmin = selection.deleted_by_admin !== true; // ⭐ חדש: לא מציגים טפסים שנמחקו על ידי מנהל
    return isRecent && shouldShow && notDeletedByAdmin;
  }) : [];

  if (isLoading) {
    return (
      <Card className="bg-white shadow-lg border-purple-100">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-purple-900">
            <History className="w-5 h-5" />
            <span>היסטוריית בחירות</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      {/* Max Submissions Reached Alert - FULLY RESPONSIVE */}
      <AnimatePresence mode="wait">
        {showMaxReachedAlert && (
          <motion.div
            key="max-reached-alert"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-2 sm:p-4"
            onClick={() => setShowMaxReachedAlert(false)}
          >
            <motion.div
              initial={{ y: -50 }}
              animate={{ y: 0 }}
              exit={{ y: 50 }}
              className="bg-white rounded-xl sm:rounded-2xl shadow-2xl p-3 sm:p-5 md:p-6 max-w-[90%] sm:max-w-md w-full border-2 sm:border-4 border-amber-400"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="text-center">
                <div className="w-10 h-10 sm:w-14 sm:h-14 md:w-16 md:h-16 bg-gradient-to-br from-amber-400 to-orange-500 rounded-full flex items-center justify-center mx-auto mb-2 sm:mb-3 md:mb-4">
                  <AlertCircle className="w-5 h-5 sm:w-7 sm:h-7 md:w-9 md:h-9 text-white" />
                </div>
                <h3 className="text-base sm:text-lg md:text-xl lg:text-2xl font-black text-gray-900 mb-1 sm:mb-2">
                  ⚠️ לא ניתן לשלוח שוב!
                </h3>
                <p className="text-xs sm:text-sm md:text-base text-gray-700 mb-1">
                  קיים טופס <strong className="text-green-600">ירוק</strong>
                </p>
                <p className="text-xs sm:text-sm md:text-base text-gray-700 mb-2 sm:mb-3">
                  עבור הכינוי <strong className="text-purple-600">"{maxReachedNickname}"</strong>
                </p>
                <div className="bg-blue-50 rounded-lg p-2 sm:p-3 mb-2 sm:mb-3 border border-blue-200 sm:border-2">
                  <p className="text-xs sm:text-sm text-blue-800">
                    💡 ניתן להשתמש ב"שלח שוב" רק כאשר הטופס <strong className="text-red-600">הופך לאדום</strong> בפאנל הניהול
                  </p>
                </div>
                <Button
                  onClick={() => setShowMaxReachedAlert(false)}
                  className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-bold px-4 sm:px-6 md:px-8 py-2 text-xs sm:text-sm md:text-base h-9 sm:h-10"
                >
                  הבנתי
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Resend Success Message - FULLY RESPONSIVE */}
      <AnimatePresence mode="wait">
        {showResendSuccess && (
          <motion.div
            key="resend-success-alert"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-2 sm:p-4"
            onClick={() => setShowResendSuccess(false)}
          >
            <motion.div
              initial={{ y: -50 }}
              animate={{ y: 0 }}
              exit={{ y: 50 }}
              className="bg-white rounded-xl sm:rounded-2xl shadow-2xl p-3 sm:p-5 md:p-6 max-w-[90%] sm:max-w-md w-full border-2 sm:border-4 border-green-400"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="text-center">
                <div className="w-10 h-10 sm:w-14 sm:h-14 md:w-16 md:h-16 bg-gradient-to-br from-green-400 to-emerald-500 rounded-full flex items-center justify-center mx-auto mb-2 sm:mb-3 md:mb-4 animate-bounce">
                  <CheckCircle className="w-5 h-5 sm:w-7 sm:h-7 md:w-9 md:h-9 text-white" />
                </div>
                <h3 className="text-base sm:text-lg md:text-xl lg:text-2xl font-black text-gray-900 mb-1 sm:mb-2">
                  נשלח שוב בהצלחה!
                </h3>
                <p className="text-xs sm:text-sm md:text-base text-gray-600">
                  המספרים נשלחו מחדש למערכת ✅
                </p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <Card className="bg-white shadow-lg border-purple-100">
          <CollapsibleTrigger asChild>
            <CardHeader className="bg-gradient-to-r from-purple-50 to-pink-50 border-b-2 border-purple-100 cursor-pointer hover:bg-purple-50 transition-colors p-3 sm:p-4">
              <CardTitle className="flex items-center justify-between text-purple-900">
                <div className="flex items-center gap-2">
                  <History className="w-4 h-4 sm:w-5 sm:h-5" />
                  <div>
                    <span className="text-sm sm:text-base">היסטוריית בחירות</span>
                    <p className="text-xs text-gray-500 mt-1 font-normal">מציג בחירות משבוע אחרון בלבד</p>
                  </div>
                </div>
                {isOpen ? (
                  <ChevronUp className="w-4 h-4 sm:w-5 sm:h-5 text-purple-700" />
                ) : (
                  <ChevronDown className="w-4 h-4 sm:w-5 sm:h-5 text-purple-700" />
                )}
              </CardTitle>
            </CardHeader>
          </CollapsibleTrigger>
          
          <CollapsibleContent>
            <CardContent className="p-3 sm:p-4 space-y-2 sm:space-y-3">
              {recentSelections.length === 0 ? (
                <div className="text-center py-8 sm:py-12">
                  <div className="w-12 h-12 sm:w-16 sm:h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-3 sm:mb-4">
                    <History className="w-6 h-6 sm:w-8 sm:h-8 text-purple-400" />
                  </div>
                  <p className="text-gray-500 text-sm sm:text-base lg:text-lg">אין בחירות מהשבוע האחרון</p>
                  <p className="text-gray-400 text-xs sm:text-sm mt-1">התחל לבחור מספרים כדי לראות את ההיסטוריה שלך</p>
                </div>
              ) : (
                <AnimatePresence mode="popLayout">
                  {recentSelections.map((selection, index) => {
                    const canEditNow = canEdit(selection);
                    
                    return (
                      <motion.div
                        key={`${selection.id}-${selection.created_date}`}
                        layout
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20, transition: { duration: 0.2 } }}
                        transition={{ delay: index * 0.05 }}
                        className="rounded-lg p-4 md:p-5 border-2 hover:shadow-md transition-shadow bg-gradient-to-br from-purple-50 to-pink-50 border-purple-200"
                      >
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <User className="w-5 h-5 text-purple-600" />
                            <span className="font-bold text-lg text-purple-900">
                              {selection.nickname}
                            </span>
                            {selection.is_recurring && (
                              <Badge className="bg-gradient-to-r from-green-500 to-emerald-500 text-white text-xs">
                                <RefreshCw className="w-3 h-3 ml-1" />
                                חוזר
                              </Badge>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-2 text-sm text-gray-600 mb-3">
                          <Calendar className="w-4 h-4" />
                          <span>
                            📅 {new Date(selection.created_date).toLocaleDateString('he-IL', { timeZone: 'Asia/Jerusalem' })}
                          </span>
                        </div>
                        
                        <div className="flex gap-2 flex-wrap mb-3">
                          {selection.numbers.sort((a, b) => a - b).map((num) => (
                            <Badge
                              key={num}
                              className="bg-gradient-to-br from-purple-500 to-pink-500 text-white font-bold text-base md:text-lg px-3 py-1 shadow-md"
                            >
                              {num}
                            </Badge>
                          ))}
                        </div>
                        
                        {selection.notes && (
                          <p className="text-sm text-gray-600 mb-3 italic">{selection.notes}</p>
                        )}

                        {/* Action buttons */}
                        <div className="flex gap-2 flex-wrap">
                          {canEditNow && onEditSelection && (
                            <Button
                              onClick={() => onEditSelection(selection)}
                              size="sm"
                              className="flex-1 min-w-[110px] bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-bold shadow-md text-sm h-10 md:h-11"
                            >
                              <Edit2 className="w-4 h-4 ml-2" />
                              ערוך 🔧
                            </Button>
                          )}

                          {onResendNumbers && (
                            <Button
                              onClick={() => handleResend(selection.numbers, selection.nickname)}
                              disabled={isGloballyLocked}
                              size="sm"
                              className="flex-1 min-w-[110px] bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white font-bold shadow-md disabled:opacity-50 disabled:cursor-not-allowed text-sm h-10 md:h-11"
                            >
                              <Send className="w-4 h-4 ml-2" />
                              {isGloballyLocked ? "⏳" : "שלח שוב 🔄"}
                            </Button>
                          )}
                          
                          {!onResendNumbers && (
                            <div className="flex-1 min-w-[110px] text-center text-sm py-2 bg-gray-100 rounded">
                              🔒 נעול
                            </div>
                          )}

                          {/* Cancel/Delete Button */}
                          <Button
                            onClick={() => handleDeleteClick(selection)}
                            disabled={isDeletingSelection}
                            size="sm"
                            variant="outline"
                            className="border-2 border-red-400 text-red-700 hover:bg-red-50 hover:border-red-500 font-bold text-sm h-10 md:h-11 px-4"
                          >
                            <Trash2 className="w-4 h-4 ml-2" />
                            בטל 🚫
                          </Button>
                        </div>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              )}
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Trash2 className="w-5 h-5 text-red-600" />
              ביטול שליחה
            </AlertDialogTitle>
            <AlertDialogDescription>
              <div className="space-y-3">
                <p className="font-bold text-base">האם אתה בטוח שברצונך לבטל את השליחה הזו?</p>
                {selectionToDelete && (
                  <div className="bg-purple-50 rounded-lg p-3 border-2 border-purple-200">
                    <p className="text-sm text-purple-900 mb-2 font-bold flex items-center gap-2">
                      <User className="w-4 h-4" />
                      כינוי: {selectionToDelete.nickname}
                    </p>
                    <p className="text-sm text-gray-600 mb-2">
                      📅 {new Date(selectionToDelete.created_date).toLocaleDateString('he-IL', { timeZone: 'Asia/Jerusalem', year: 'numeric', month: 'long', day: 'numeric' })} בשעה {new Date(selectionToDelete.created_date).toLocaleTimeString('he-IL', { timeZone: 'Asia/Jerusalem', hour: '2-digit', minute: '2-digit' })}
                    </p>
                    <div className="flex gap-1 flex-wrap">
                      {selectionToDelete.numbers.sort((a, b) => a - b).map((num) => (
                        <Badge
                          key={num}
                          className="bg-gradient-to-br from-purple-500 to-pink-500 text-white font-bold"
                        >
                          {num}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
                <p className="text-red-600 font-semibold text-sm">
                  ⚠️ פעולה זו תמחק את הבחירה ולא ניתן לשחזר אותה!
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleCancelDelete}>
              ביטול
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              disabled={isDeletingSelection}
              className="bg-red-600 hover:bg-red-700"
            >
              {isDeletingSelection ? "מבטל..." : "בטל שליחה"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
