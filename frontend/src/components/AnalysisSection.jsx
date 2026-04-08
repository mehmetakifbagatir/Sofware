import React from "react";
import { FileText, Lightbulb, TrendingUp, AlertTriangle } from "lucide-react";

export default function AnalysisSection({ text }) {
  const hasAnalysis = text && text.length > 0;

  // Split analysis into paragraphs for better formatting
  const paragraphs = hasAnalysis 
    ? text.split('\n').filter(p => p.trim().length > 0)
    : [];

  // Detect if text contains conclusion
  const hasConclusion = text?.toLowerCase().includes('conclusion');

  return (
    <section className="space-y-6" data-testid="analysis-section">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-cyan-500/20 to-teal-500/20 border border-cyan-500/20 flex items-center justify-center">
          <Lightbulb className="w-5 h-5 text-cyan-400" />
        </div>
        <h2 className="text-lg font-medium text-zinc-200">Analysis & Insights</h2>
      </div>

      {hasAnalysis ? (
        <div className="analysis-section space-y-4" data-testid="analysis-text">
          {paragraphs.map((paragraph, index) => {
            const isConclusion = paragraph.toLowerCase().includes('conclusion');
            
            return (
              <div 
                key={index}
                className={`animate-fade-in ${isConclusion ? 'mt-6 pt-6 border-t border-white/10' : ''}`}
                style={{ animationDelay: `${index * 150}ms` }}
              >
                {isConclusion && (
                  <div className="flex items-center gap-2 mb-3">
                    <TrendingUp className="w-4 h-4 text-cyan-400" />
                    <span className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-400">
                      Recommendation
                    </span>
                  </div>
                )}
                <p className="text-zinc-400 leading-relaxed">
                  {highlightKeyTerms(paragraph)}
                </p>
              </div>
            );
          })}

          {/* Key Takeaways */}
          <div className="mt-8 p-4 rounded-lg bg-white/[0.02] border border-white/5">
            <div className="flex items-center gap-2 mb-3">
              <FileText className="w-4 h-4 text-zinc-500" />
              <span className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">
                Key Takeaways
              </span>
            </div>
            <ul className="space-y-2">
              <li className="flex items-start gap-2 text-sm text-zinc-400">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 mt-1.5 flex-shrink-0" />
                <span>No rate limiting provides maximum throughput but no protection</span>
              </li>
              <li className="flex items-start gap-2 text-sm text-zinc-400">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-1.5 flex-shrink-0" />
                <span>Fixed window is simple but allows burst traffic at boundaries</span>
              </li>
              <li className="flex items-start gap-2 text-sm text-zinc-400">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 mt-1.5 flex-shrink-0" />
                <span>Sliding window offers the most precise and stable rate control</span>
              </li>
            </ul>
          </div>
        </div>
      ) : (
        <div className="py-12 px-6 text-center border border-dashed border-white/10 rounded-lg" data-testid="analysis-text">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-white/5 flex items-center justify-center">
            <AlertTriangle className="w-8 h-8 text-zinc-600" />
          </div>
          <h3 className="text-lg font-medium text-zinc-400 mb-2">No Analysis Available</h3>
          <p className="text-zinc-600 text-sm max-w-md mx-auto">
            Run the "Run All Strategies" experiment to generate a detailed analysis comparing 
            different rate limiting approaches and their impact on system performance.
          </p>
        </div>
      )}
    </section>
  );
}

// Helper function to highlight key terms in the analysis text
function highlightKeyTerms(text) {
  const terms = [
    { pattern: /\b(\d+(?:\.\d+)?%)/g, className: "text-cyan-400 font-mono" },
    { pattern: /\b(\d+(?:\.\d+)?\s*req\/s)/gi, className: "text-emerald-400 font-mono" },
    { pattern: /\b(\d+(?:,\d+)*)\s*(requests?)/gi, className: "text-white font-mono", group: 1 },
    { pattern: /(No Limit|Fixed Window|Sliding Window)/gi, className: "text-white font-medium" },
    { pattern: /(stability score of \d+(?:\.\d+)?)/gi, className: "text-amber-400" },
    { pattern: /(overload|burst|protection|stable)/gi, className: "text-zinc-300" }
  ];

  // Simple implementation - just return the text with some basic formatting
  // For complex highlighting, you'd need a more sophisticated approach
  const parts = [];
  let lastIndex = 0;
  let key = 0;

  // Find all matches and their positions
  const matches = [];
  terms.forEach(term => {
    let match;
    const regex = new RegExp(term.pattern.source, term.pattern.flags);
    while ((match = regex.exec(text)) !== null) {
      matches.push({
        start: match.index,
        end: match.index + match[0].length,
        text: match[term.group || 0],
        className: term.className
      });
    }
  });

  // Sort by position
  matches.sort((a, b) => a.start - b.start);

  // Remove overlapping matches
  const filteredMatches = [];
  let lastEnd = 0;
  matches.forEach(match => {
    if (match.start >= lastEnd) {
      filteredMatches.push(match);
      lastEnd = match.end;
    }
  });

  // Build the result
  filteredMatches.forEach(match => {
    if (match.start > lastIndex) {
      parts.push(text.slice(lastIndex, match.start));
    }
    parts.push(
      <span key={key++} className={match.className}>
        {match.text}
      </span>
    );
    lastIndex = match.end;
  });

  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return parts.length > 0 ? parts : text;
}
