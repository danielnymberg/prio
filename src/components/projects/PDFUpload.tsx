import { useState, useCallback } from 'react';
import { Upload, FileText, X, Loader2, Sparkles } from 'lucide-react';
import toast from 'react-hot-toast';

interface PDFUploadProps {
  onExtractedData: (data: any) => void;
}

export function PDFUpload({ onExtractedData }: PDFUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const files = Array.from(e.dataTransfer.files);
    const pdfFile = files.find(file => file.type === 'application/pdf');

    if (pdfFile) {
      handleFile(pdfFile);
    } else {
      toast.error('Vänligen ladda upp en PDF-fil');
    }
  }, []);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type === 'application/pdf') {
      handleFile(file);
    } else {
      toast.error('Vänligen ladda upp en PDF-fil');
    }
  };

  const handleFile = async (file: File) => {
    setUploadedFile(file);
    setIsProcessing(true);

    try {
      // Konvertera PDF till base64
      const base64 = await fileToBase64(file);

      // Skicka till backend för Claude API-analys
      const response = await fetch('/api/claude-chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: [
            {
              role: 'user',
              content: [
                {
                  type: 'document',
                  source: {
                    type: 'base64',
                    media_type: 'application/pdf',
                    data: base64,
                  },
                },
                {
                  type: 'text',
                  text: `Analysera denna offert/projektdokument och extrahera följande information i JSON-format:

{
  "name": "Projektnamn",
  "client_name": "Kundnamn",
  "quoted_hours": antal timmar (nummer),
  "hourly_rate": timpris i kronor (nummer),
  "external_costs": övriga kostnader i kronor (nummer, 0 om inte angivet),
  "project_deadline": deadline i ISO-format YYYY-MM-DD (eller null om inte angivet),
  "description": kort beskrivning av projektet
}

VIKTIGT:
- Svara ENDAST med valid JSON, inget annat
- Om information saknas, använd null eller 0
- Leta efter ord som "timmar", "h", "hours", "timpris", "kr/h", "deadline", "leverans"
- Beräkna externa kostnader från resor, material, externa tjänster om de nämns`,
                },
              ],
            },
          ],
          max_tokens: 1000,
        }),
      });

      if (!response.ok) {
        throw new Error('Kunde inte analysera PDF');
      }

      const data = await response.json();
      const contentText = data.content[0].text;

      // Parse JSON från Claude's svar (ta bort eventuella markdown-backticks)
      let cleanedText = contentText.trim();
      cleanedText = cleanedText.replace(/```json\n?/g, '').replace(/```\n?/g, '');

      const extractedData = JSON.parse(cleanedText);

      toast.success('PDF analyserad! Granska informationen nedan.');
      onExtractedData(extractedData);
    } catch (error) {
      console.error('Error processing PDF:', error);
      toast.error('Kunde inte analysera PDF. Försök igen eller fyll i manuellt.');
    } finally {
      setIsProcessing(false);
    }
  };

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const result = reader.result as string;
        // Ta bort data:application/pdf;base64, prefix
        const base64 = result.split(',')[1];
        resolve(base64);
      };
      reader.onerror = error => reject(error);
    });
  };

  const handleRemoveFile = () => {
    setUploadedFile(null);
  };

  if (isProcessing) {
    return (
      <div className="p-8 border-2 border-dashed border-amber-300 dark:border-amber-700 rounded-xl bg-amber-50 dark:bg-amber-900/10 text-center">
        <Loader2 className="h-12 w-12 text-amber-600 dark:text-amber-400 animate-spin mx-auto mb-4" />
        <p className="text-lg font-semibold text-amber-900 dark:text-amber-100 mb-2">
          Analyserar PDF med AI...
        </p>
        <p className="text-sm text-amber-700 dark:text-amber-300">
          Detta tar vanligtvis 5-15 sekunder
        </p>
      </div>
    );
  }

  if (uploadedFile) {
    return (
      <div className="p-6 border-2 border-amber-500 dark:border-amber-400 rounded-xl bg-amber-50 dark:bg-amber-900/20">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <FileText className="h-8 w-8 text-amber-600 dark:text-amber-400" />
            <div>
              <p className="font-semibold text-amber-900 dark:text-amber-100">
                {uploadedFile.name}
              </p>
              <p className="text-sm text-amber-700 dark:text-amber-300">
                {(uploadedFile.size / 1024).toFixed(0)} KB
              </p>
            </div>
          </div>
          <button
            onClick={handleRemoveFile}
            className="p-2 hover:bg-amber-100 dark:hover:bg-amber-900/30 rounded-lg transition-colors"
          >
            <X className="h-5 w-5 text-amber-700 dark:text-amber-300" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`p-8 border-2 border-dashed rounded-xl transition-colors cursor-pointer ${
        isDragging
          ? 'border-amber-500 dark:border-amber-400 bg-amber-50 dark:bg-amber-900/20'
          : 'border-gray-300 dark:border-gray-600 hover:border-amber-400 dark:hover:border-amber-500 bg-gray-50 dark:bg-gray-800'
      }`}
    >
      <input
        type="file"
        accept="application/pdf"
        onChange={handleFileInput}
        className="hidden"
        id="pdf-upload"
      />
      <label htmlFor="pdf-upload" className="cursor-pointer">
        <div className="text-center">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Upload className="h-12 w-12 text-amber-600 dark:text-amber-400" />
            <Sparkles className="h-6 w-6 text-amber-500 dark:text-amber-400 animate-pulse" />
          </div>
          <p className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
            Dra och släpp offert-PDF här
          </p>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
            eller klicka för att välja fil
          </p>
          <p className="text-xs text-amber-700 dark:text-amber-300 mt-3 flex items-center justify-center gap-1">
            <Sparkles className="h-4 w-4" />
            AI extraherar automatiskt timmar, pris och deadline
          </p>
        </div>
      </label>
    </div>
  );
}
