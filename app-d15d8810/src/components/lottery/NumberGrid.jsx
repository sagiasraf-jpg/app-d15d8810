import React, { useState, useEffect } from "react";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { RotateCcw, Send, AlertCircle, Edit2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const TOTAL_NUMBERS = 37;
const MAX_SELECTIONS = 6;

export default function NumberGrid({ onSubmit, isSubmitting, user, canSubmit = true, editingSelection = null, onCancelEdit = null }) {
  const [selectedNumbers, setSelectedNumbers] = useState([]);
  const [showError, setShowError] = useState(false);

  // Load numbers when editing
  useEffect(() => {
    if (editingSelection) {
      setSelectedNumbers(editingSelection.numbers);
    }
  }, [editingSelection]);

  const handleNumberClick = (number) => {
    if (selectedNumbers.includes(number)) {
      setSelectedNumbers(selectedNumbers.filter(n => n !== number));
      setShowError(false);
    } else if (selectedNumbers.length < MAX_SELECTIONS) {
      setSelectedNumbers([...selectedNumbers, number].sort((a, b) => a - b));
      setShowError(false);
    } else {
      setShowError(true);
      setTimeout(() => setShowError(false), 3000);
    }
  };

  const handleClear = () => {
    setSelectedNumbers([]);
    setShowError(false);
  };

  const handleSubmit = () => {
    if (selectedNumbers.length !== MAX_SELECTIONS) {
      return;
    }
    
    if (isSubmitting) {
      return;
    }

    onSubmit(selectedNumbers);
    if (!editingSelection) {
      setSelectedNumbers([]);
    }
  };

  const isNumberSelected = (number) => selectedNumbers.includes(number);

  return (
    <Card className="bg-white shadow-xl border-2 border-purple-300">
      
      <CardContent className="p-2 sm:p-3 md:p-4 lg:p-6 space-y-2 sm:space-y-3 md:space-y-4">
        {/* Editing Alert */}
        {editingSelection && (
          <Alert className="bg-amber-50 border-amber-300">
            <Edit2 className="h-4 w-4 sm:h-5 sm:w-5 text-amber-600" />
            <AlertDescription className="text-amber-800 font-bold text-xs sm:text-sm md:text-base">
              🔧 אתה עורך את הבחירה של "{editingSelection.nickname}"
            </AlertDescription>
          </Alert>
        )}

        {/* Selection Counter */}
        <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg p-2 sm:p-3 md:p-4 lg:p-5 border-2 border-purple-300 shadow-sm">
          <div className="flex items-center justify-between mb-2 sm:mb-3">
            <span className="text-sm sm:text-base md:text-lg lg:text-xl font-bold text-gray-700">
              נבחרו {selectedNumbers.length} מתוך {MAX_SELECTIONS}
            </span>
            <div className="flex gap-1 sm:gap-1.5">
              {Array.from({ length: MAX_SELECTIONS }).map((_, i) => (
                <div
                  key={i}
                  className={`w-2 h-2 sm:w-3 sm:h-3 md:w-4 md:h-4 rounded-full transition-colors duration-300 ${
                    i < selectedNumbers.length
                      ? "bg-gradient-to-r from-purple-500 to-pink-500 shadow-md"
                      : "bg-gray-200"
                  }`}
                />
              ))}
            </div>
          </div>
          
          {selectedNumbers.length > 0 && (
            <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
              <span className="text-xs sm:text-sm md:text-base lg:text-lg text-gray-600 font-semibold">המספרים שבחרת:</span>
              {selectedNumbers.map(num => (
                <span
                  key={num}
                  className="inline-flex items-center justify-center w-7 h-7 sm:w-9 sm:h-9 md:w-10 md:h-10 lg:w-12 lg:h-12 bg-gradient-to-br from-purple-500 to-pink-500 text-white font-bold rounded-full text-sm sm:text-base md:text-lg lg:text-xl shadow-md"
                >
                  {num}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Error Message */}
        <AnimatePresence>
          {showError && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              <Alert variant="destructive" className="bg-red-50 border-red-300 shadow-md">
                <AlertCircle className="h-4 w-4 sm:h-5 sm:w-5" />
                <AlertDescription className="font-bold text-xs sm:text-sm md:text-base">
                  אין אפשרות לבחור יותר מ-6 מספרים
                </AlertDescription>
              </Alert>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Number Grid - FULLY RESPONSIVE */}
        <div className="grid grid-cols-7 gap-1 sm:gap-1.5 md:gap-2 lg:gap-3">
          {Array.from({ length: TOTAL_NUMBERS }, (_, i) => i + 1).map((number) => {
            const isSelected = isNumberSelected(number);
            return (
              <motion.button
                key={number}
                onClick={() => handleNumberClick(number)}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className={`
                  aspect-square rounded-md sm:rounded-lg md:rounded-xl font-bold text-sm sm:text-base md:text-lg lg:text-xl transition-all duration-200
                  ${isSelected
                    ? "bg-gradient-to-br from-purple-500 to-pink-500 text-white shadow-lg scale-105 ring-1 sm:ring-2 md:ring-3 ring-purple-300"
                    : "bg-white border border-gray-200 sm:border-2 text-gray-700 hover:border-purple-400 hover:bg-purple-50 shadow-sm"
                  }
                `}
              >
                {number}
              </motion.button>
            );
          })}
        </div>
      </CardContent>

      <CardFooter className="flex gap-1 sm:gap-2 md:gap-3 p-2 sm:p-3 md:p-4 lg:p-6 bg-gradient-to-r from-purple-50 to-pink-50 border-t-2 border-purple-200">
        {editingSelection && onCancelEdit && (
          <Button
            onClick={onCancelEdit}
            variant="outline"
            className="flex-1 border border-gray-400 sm:border-2 text-gray-700 hover:bg-gray-100 hover:border-gray-500 font-semibold text-xs sm:text-sm md:text-base h-9 sm:h-10 md:h-12 lg:h-14"
            disabled={isSubmitting}
          >
            <RotateCcw className="w-3 h-3 sm:w-4 sm:h-4 md:w-5 md:h-5 ml-1" />
            ביטול
          </Button>
        )}
        <Button
          onClick={handleClear}
          variant="outline"
          className="flex-1 border border-purple-400 sm:border-2 text-purple-700 hover:bg-purple-100 hover:border-purple-500 font-semibold text-xs sm:text-sm md:text-base h-9 sm:h-10 md:h-12 lg:h-14"
          disabled={selectedNumbers.length === 0 || isSubmitting}
        >
          <RotateCcw className="w-3 h-3 sm:w-4 sm:h-4 md:w-5 md:h-5 ml-1" />
          נקה
        </Button>
        <Button
          onClick={handleSubmit}
          disabled={selectedNumbers.length !== MAX_SELECTIONS || isSubmitting}
          className="flex-1 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-bold shadow-lg text-xs sm:text-sm md:text-base h-9 sm:h-10 md:h-12 lg:h-14"
        >
          <Send className="w-3 h-3 sm:w-4 sm:h-4 md:w-5 md:h-5 ml-1" />
          {isSubmitting ? "שולח..." : editingSelection ? "שמור" : "שלח"}
        </Button>
      </CardFooter>
    </Card>
  );
}