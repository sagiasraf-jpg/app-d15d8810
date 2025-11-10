
import React from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Trophy, Calendar } from "lucide-react";
import { format } from "date-fns";
import { he } from "date-fns/locale";
import { motion } from "framer-motion";

export default function WinningNumbersDisplay() {
  const { data: winningNumbers, isLoading } = useQuery({
    queryKey: ['winning-numbers-latest'],
    queryFn: async () => {
      const results = await base44.entities.WinningNumbers.list('-created_date', 1);
      return results[0] || null;
    },
    initialData: null,
  });

  if (isLoading) {
    return null;
  }

  if (!winningNumbers) {
    return null;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <Card className="border-4 border-blue-400 shadow-2xl bg-gradient-to-br from-blue-50 to-sky-50">
        <CardHeader className="bg-gradient-to-r from-blue-500 via-sky-500 to-cyan-500 text-white border-b-4 border-blue-600">
          <CardTitle className="text-center text-2xl font-black flex items-center justify-center gap-3">
            <Trophy className="w-8 h-8 animate-bounce" />
            המספרים הזוכים 🎉
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="text-center space-y-4">
            {/* Week Description */}
            <div className="bg-white rounded-lg p-3 border-2 border-blue-300 shadow-md">
              <p className="text-xl font-bold text-blue-900">
                {winningNumbers.week_description || "הגרלה אחרונה"}
              </p>
              <div className="flex items-center justify-center gap-2 text-sm text-gray-600 mt-1">
                <Calendar className="w-4 h-4" />
                <span>
                  {format(new Date(winningNumbers.draw_date), "d בMMMM yyyy", { locale: he })}
                </span>
              </div>
            </div>

            {/* Winning Numbers */}
            <div className="flex justify-center gap-3 flex-wrap">
              {winningNumbers.numbers.sort((a, b) => a - b).map((num, index) => (
                <motion.div
                  key={num}
                  initial={{ scale: 0, rotate: -180 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ 
                    delay: index * 0.1,
                    type: "spring",
                    stiffness: 200,
                    damping: 10
                  }}
                >
                  <div className="relative">
                    <Badge className="bg-gradient-to-br from-red-500 to-red-600 text-white font-black text-3xl px-6 py-3 shadow-2xl ring-4 ring-red-300 ring-offset-2">
                      {num}
                    </Badge>
                    {/* Sparkle effect */}
                    <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-300 rounded-full animate-ping"></div>
                  </div>
                </motion.div>
              ))}
            </div>

            {/* Congratulations Text */}
            <div className="bg-gradient-to-r from-blue-100 to-sky-100 rounded-lg p-4 border-2 border-blue-400">
              <p className="text-lg font-bold text-blue-900">
                ✨ בדקו אם יש לכם התאמה עם המספרים האלה! ✨
              </p>
              <p className="text-sm text-blue-800 mt-1">
                אפשר למצוא את הבחירות שלכם בהיסטוריה מצד ימין 👉
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
