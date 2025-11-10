
import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Trophy, Users, Star, Search, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { Input } from "@/components/ui/input";

export default function AllResultsPage() {
  const [user, setUser] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    document.title = "כל התוצאות 🏆 | לוטו שכונתי";
    loadUser();
  }, []);

  const loadUser = async () => {
    try {
      const currentUser = await base44.auth.me();
      setUser(currentUser);
    } catch (error) {
      console.error("Error loading user:", error);
    }
  };

  // ✅ REMOVED: PublishSettings query - no longer needed

  const { data: allSelections, isLoading: loadingSelections } = useQuery({
    queryKey: ['all-selections-published'],
    queryFn: async () => {
      const results = await base44.entities.LotterySelection.filter(
        { is_published: true },
        '-created_date'
      );
      return results;
    },
    initialData: [],
  });

  const { data: winningNumbers } = useQuery({
    queryKey: ['winning-numbers-latest'],
    queryFn: async () => {
      const results = await base44.entities.WinningNumbers.list('-created_date', 1);
      return results[0] || null;
    },
    initialData: null,
  });

  const handleNavigateToLottery = () => {
    navigate(createPageUrl("Lottery"));
  };

  // Calculate matches if winning numbers exist
  const selectionsWithMatches = allSelections.map(selection => {
    if (!winningNumbers) return { ...selection, matches: 0 };
    
    const matches = selection.numbers.filter(num => 
      winningNumbers.numbers.includes(num)
    ).length;
    
    return { ...selection, matches };
  }).sort((a, b) => b.matches - a.matches);

  // Filter by search term
  const filteredSelections = selectionsWithMatches.filter(selection =>
    !searchTerm || 
    selection.nickname?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    selection.user_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Find max matches for highlighting winners
  const maxMatches = filteredSelections.length > 0 
    ? Math.max(...filteredSelections.map(s => s.matches))
    : 0;

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 text-lg">טוען...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50 p-2 sm:p-4 md:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Mobile Back to Form Button */}
        <div className="lg:hidden mb-2">
          <Button
            onClick={handleNavigateToLottery}
            size="sm"
            className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-semibold text-xs sm:text-sm h-9 sm:h-10"
          >
            <FileText className="w-3 h-3 sm:w-4 sm:h-4 ml-1" />
            טופס לוטו 📝
          </Button>
        </div>

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-4 sm:mb-6"
        >
          <div className="flex items-center justify-center gap-2 mb-2 sm:mb-3">
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl flex items-center justify-center shadow-xl">
              <Trophy className="w-5 h-5 sm:w-6 sm:h-6 md:w-7 md:h-7 text-white" />
            </div>
          </div>
          <h1 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent mb-2">
            כל התוצאות 🎯
          </h1>
          <p className="text-sm sm:text-base text-gray-600 flex items-center justify-center gap-2">
            <Users className="w-3 h-3 sm:w-4 sm:h-4" />
            {selectionsWithMatches.length} טפסים מפורסמים
          </p>
        </motion.div>

        {/* Search Bar */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-3 sm:mb-4 max-w-md mx-auto"
        >
          <div className="relative">
            <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 h-3 w-3 sm:h-4 sm:w-4 text-purple-400" />
            <Input
              placeholder="חפש כינוי..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pr-10 border-2 border-purple-300 focus:border-purple-500 bg-white shadow-lg text-xs sm:text-sm md:text-base h-9 sm:h-10 md:h-11 rounded-xl"
            />
          </div>
          {searchTerm && (
            <p className="text-xs text-gray-600 mt-2 text-center">
              נמצאו {filteredSelections.length} תוצאות
            </p>
          )}
        </motion.div>

        {/* Winning Numbers Display - FULLY RESPONSIVE */}
        {winningNumbers && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-3 sm:mb-4 md:mb-6 lg:mb-8"
          >
            <Card className="border-2 sm:border-3 md:border-4 border-red-400 shadow-2xl bg-gradient-to-br from-red-50 to-pink-50">
              <CardHeader className="bg-gradient-to-r from-red-500 via-pink-500 to-orange-500 text-white border-b-2 sm:border-b-3 md:border-b-4 border-red-600 p-2 sm:p-3 md:p-4 lg:p-6">
                <CardTitle className="text-center text-sm sm:text-base md:text-lg lg:text-xl xl:text-2xl font-black flex items-center justify-center gap-1 sm:gap-2">
                  <Trophy className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 lg:w-7 lg:h-7 xl:w-8 xl:h-8 animate-bounce" />
                  המספרים הזוכים 🎉
                </CardTitle>
              </CardHeader>
              <CardContent className="p-2 sm:p-3 md:p-4 lg:p-6">
                <div className="text-center">
                  <p className="text-xs sm:text-sm md:text-base lg:text-lg xl:text-xl font-bold text-red-900 mb-1 sm:mb-2 md:mb-3 lg:mb-4">
                    {winningNumbers.week_description || "הגרלה אחרונה"}
                  </p>
                  <div className="flex justify-center gap-1 sm:gap-1.5 md:gap-2 lg:gap-3 flex-wrap">
                    {winningNumbers.numbers.sort((a, b) => a - b).map((num) => (
                      <Badge
                        key={num}
                        className="bg-gradient-to-br from-red-500 to-red-600 text-white font-black text-sm sm:text-base md:text-lg lg:text-xl xl:text-2xl 2xl:text-3xl px-2 sm:px-3 md:px-4 lg:px-6 py-0.5 sm:py-1 md:py-2 lg:py-3 shadow-2xl ring-1 sm:ring-2 md:ring-3 lg:ring-4 ring-red-300"
                      >
                        {num}
                      </Badge>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Results Table - Same for Mobile and Desktop */}
        {loadingSelections ? (
          <div className="text-center py-12">
            <div className="w-10 h-10 md:w-12 md:h-12 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-600 text-sm md:text-base">טוען תוצאות...</p>
          </div>
        ) : filteredSelections.length === 0 ? (
          <Alert className="max-w-2xl mx-auto">
            <AlertDescription className="text-center text-gray-600 text-base md:text-lg py-6 md:py-8">
              {searchTerm ? `לא נמצאו תוצאות עבור "${searchTerm}"` : "אין עדיין בחירות מפורסמות"}
            </AlertDescription>
          </Alert>
        ) : (
          <Card className="border-2 border-purple-300 shadow-2xl bg-white">
            <CardHeader className="bg-gradient-to-r from-purple-100 to-pink-100 border-b-2 border-purple-200 py-2 sm:py-3 md:py-4 px-2 sm:px-3 md:px-6">
              <CardTitle className="text-sm sm:text-base md:text-xl lg:text-2xl font-bold text-purple-900 text-center">
                טבלת תוצאות
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                {/* Create rows with 2 selections each - 2 columns even on mobile */}
                {Array.from({ length: Math.ceil(filteredSelections.length / 2) }).map((_, rowIndex) => {
                  const selection1 = filteredSelections[rowIndex * 2];
                  const selection2 = filteredSelections[rowIndex * 2 + 1];
                  const isWinner1 = winningNumbers && selection1.matches === maxMatches && maxMatches > 0;
                  const isWinner2 = selection2 && winningNumbers && selection2.matches === maxMatches && maxMatches > 0;

                  return (
                    <div 
                      key={rowIndex}
                      className="border-b border-purple-200 grid grid-cols-2"
                    >
                      {/* First Selection */}
                      <div className={`py-2 px-1.5 sm:py-3 sm:px-2 md:py-4 md:px-4 border-l-2 border-purple-300 ${
                        isWinner1 ? "bg-gradient-to-r from-yellow-100 to-amber-100" : 
                        rowIndex % 2 === 0 ? "bg-white" : "bg-purple-25"
                      }`}>
                        <div className="flex flex-col gap-1.5 sm:gap-2">
                          {/* Nickname */}
                          <div className="flex flex-col items-center gap-0.5 sm:gap-1">
                            {isWinner1 && (
                              <Star className="w-3 h-3 sm:w-4 sm:h-4 md:w-5 md:h-5 text-yellow-500 fill-yellow-500 animate-pulse" />
                            )}
                            <div className="flex items-center gap-1">
                              <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-green-500 shadow-sm border border-green-600" />
                              <span className="font-bold text-purple-900 text-xs sm:text-sm md:text-base lg:text-lg">
                                {selection1.nickname}
                              </span>
                            </div>
                          </div>

                          {/* Numbers */}
                          <div className="flex gap-0.5 sm:gap-1 md:gap-1.5 flex-wrap justify-center">
                            {selection1.numbers.sort((a, b) => a - b).map((num) => {
                              const isMatch = winningNumbers?.numbers.includes(num);
                              return (
                                <Badge
                                  key={num}
                                  className={`font-bold text-[10px] sm:text-xs md:text-sm lg:text-base px-1 sm:px-1.5 md:px-2 py-0.5 shadow-sm ${
                                    isMatch
                                      ? "bg-gradient-to-br from-green-500 to-emerald-500 ring-1 ring-green-300 text-white"
                                      : "bg-gradient-to-br from-purple-500 to-pink-500 text-white"
                                  }`}
                                >
                                  {num}
                                </Badge>
                              );
                            })}
                          </div>
                        </div>
                      </div>

                      {/* Second Selection (if exists) */}
                      {selection2 ? (
                        <div className={`py-2 px-1.5 sm:py-3 sm:px-2 md:py-4 md:px-4 ${
                          isWinner2 ? "bg-gradient-to-r from-yellow-100 to-amber-100" : 
                          rowIndex % 2 === 0 ? "bg-white" : "bg-purple-25"
                        }`}>
                          <div className="flex flex-col gap-1.5 sm:gap-2">
                            {/* Nickname */}
                            <div className="flex flex-col items-center gap-0.5 sm:gap-1">
                              {isWinner2 && (
                                <Star className="w-3 h-3 sm:w-4 sm:h-4 md:w-5 md:h-5 text-yellow-500 fill-yellow-500 animate-pulse" />
                              )}
                              <div className="flex items-center gap-1">
                                <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-green-500 shadow-sm border border-green-600" />
                                <span className="font-bold text-purple-900 text-xs sm:text-sm md:text-base lg:text-lg">
                                  {selection2.nickname}
                                </span>
                              </div>
                            </div>

                            {/* Numbers */}
                            <div className="flex gap-0.5 sm:gap-1 md:gap-1.5 flex-wrap justify-center">
                              {selection2.numbers.sort((a, b) => a - b).map((num) => {
                                const isMatch = winningNumbers?.numbers.includes(num);
                                return (
                                  <Badge
                                    key={num}
                                    className={`font-bold text-[10px] sm:text-xs md:text-sm lg:text-base px-1 sm:px-1.5 md:px-2 py-0.5 shadow-sm ${
                                      isMatch
                                        ? "bg-gradient-to-br from-green-500 to-emerald-500 ring-1 ring-green-300 text-white"
                                        : "bg-gradient-to-br from-purple-500 to-pink-500 text-white"
                                    }`}
                                  >
                                    {num}
                                  </Badge>
                                );
                              })}
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className={`py-2 px-1.5 sm:py-3 sm:px-2 md:py-4 md:px-4 ${
                          rowIndex % 2 === 0 ? "bg-white" : "bg-purple-25"
                        }`}>
                          {/* Empty cell if odd number of selections */}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
