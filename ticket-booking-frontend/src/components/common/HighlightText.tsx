import React from 'react';

interface HighlightTextProps {
  text: string;
  highlight: string;
}

const HighlightText: React.FC<HighlightTextProps> = ({ text, highlight }) => {
  if (!highlight.trim()) {
    return <>{text}</>;
  }

  // Escape special regex characters in the search string
  const searchValue = highlight.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  
  // Create regex that matches any part of highlight string (case insensitive)
  const regex = new RegExp(`(${searchValue})`, 'gi');
  
  // Split on highlight term and include term in parts array
  const parts = text.split(regex);

  return (
    <>
      {parts.map((part, i) => {
        // Check if this part matches the search term
        const isMatch = part.toLowerCase() === highlight.toLowerCase();
        
        return isMatch ? (
          <span key={i} style={{ fontWeight: 'bold', backgroundColor: 'rgba(255, 213, 79, 0.3)' }}>
            {part}
          </span>
        ) : (
          part
        );
      })}
    </>
  );
};

export default HighlightText; 