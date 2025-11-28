export interface ScrapeResult {
  question: string;
  answer: string;
  sources: string;
}

export const exportToCSV = (results: ScrapeResult[], filename: string = 'chatgpt-results.csv') => {
  // Create CSV header
  const headers = ['Question', 'Answer', 'Sources'];
  
  // Create CSV rows
  const rows = results.map(result => {
    // Escape quotes and wrap in quotes if contains comma or newline
    const escapeCSV = (str: string) => {
      if (str.includes(',') || str.includes('\n') || str.includes('"')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };

    return [
      escapeCSV(result.question),
      escapeCSV(result.answer),
      escapeCSV(result.sources)
    ];
  });

  // Combine header and rows
  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.join(','))
  ].join('\n');

  // Create blob and download
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  URL.revokeObjectURL(url);
};

