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

      const responseText = await response.text();
      console.log('Raw response text:', responseText);
      console.log('Response status:', response.status);
      console.log('Response headers:', Object.fromEntries(response.headers.entries()));

      if (!response.ok) {
        console.error('API error response:', responseText);
        throw new Error('Kunde inte analysera PDF');
      }

      if (!responseText) {
        throw new Error('Tomt API-svar');
      }

      const data = JSON.parse(responseText);
      console.log('API response:', data);

      // Check if response has expected structure
      if (!data.content || !Array.isArray(data.content) || data.content.length === 0) {
        console.error('Invalid API response structure:', data);
        throw new Error('Ogiltigt API-svar');
      }

      const contentText = data.content[0].text;
      if (!contentText) {
        console.error('No text in response:', data.content[0]);
        throw new Error('Inget textsvar från API');
      }

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
      <div className="e-p-32 e-rounded-xl e-text-center" style={{
        border: '2px dashed var(--warning-500)',
        backgroundColor: 'rgba(245, 158, 11, 0.1)'
      }}>
        <Loader2 className="e-animate-spin e-mx-auto e-mb-16" style={{
          height: '48px',
          width: '48px',
          color: 'var(--warning-500)'
        }} />
        <p className="e-text-lg e-font-semibold e-mb-8 e-mt-0" style={{ color: 'var(--warning-500)' }}>
          Analyserar PDF med AI...
        </p>
        <p className="e-text-sm e-m-0" style={{ color: 'var(--warning-500)' }}>
          Detta tar vanligtvis 5-15 sekunder
        </p>
      </div>
    );
  }

  if (uploadedFile) {
    return (
      <div className="e-p-24 e-rounded-xl" style={{
        border: '2px solid var(--warning-500)',
        backgroundColor: 'rgba(245, 158, 11, 0.1)'
      }}>
        <div className="e-flex e-align-center e-justify-between">
          <div className="e-flex e-align-center e-gap-12">
            <FileText style={{
              height: '32px',
              width: '32px',
              color: 'var(--warning-500)'
            }} />
            <div>
              <p className="e-font-semibold e-m-0" style={{ color: 'var(--warning-500)' }}>
                {uploadedFile.name}
              </p>
              <p className="e-text-sm e-m-0" style={{ color: 'var(--warning-500)' }}>
                {(uploadedFile.size / 1024).toFixed(0)} KB
              </p>
            </div>
          </div>
          <button
            onClick={handleRemoveFile}
            className="e-p-8 e-rounded-lg e-cursor-pointer e-transition"
            style={{
              backgroundColor: 'transparent',
              border: 'none'
            }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(245, 158, 11, 0.2)'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
          >
            <X style={{
              height: '20px',
              width: '20px',
              color: 'var(--warning-500)'
            }} />
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
      className="e-p-32 e-rounded-xl e-transition e-cursor-pointer"
      style={{
        border: isDragging ? '2px dashed var(--warning-500)' : '2px dashed var(--e-border)',
        backgroundColor: isDragging ? 'rgba(245, 158, 11, 0.1)' : 'var(--e-surface-hover)'
      }}
    >
      <input
        type="file"
        accept="application/pdf"
        onChange={handleFileInput}
        className="e-hidden"
        id="pdf-upload"
      />
      <label htmlFor="pdf-upload" className="e-cursor-pointer">
        <div className="e-text-center">
          <div className="e-flex e-align-center e-justify-center e-gap-8 e-mb-16">
            <Upload style={{
              height: '48px',
              width: '48px',
              color: 'var(--warning-500)'
            }} />
            <Sparkles className="e-animate-pulse" style={{
              height: '24px',
              width: '24px',
              color: 'var(--warning-500)'
            }} />
          </div>
          <p className="e-text-lg e-font-semibold e-mb-8 e-mt-0" style={{ color: 'var(--e-text)' }}>
            Dra och släpp offert-PDF här
          </p>
          <p className="e-text-sm e-mb-4 e-mt-0" style={{ color: 'var(--e-text-secondary)' }}>
            eller klicka för att välja fil
          </p>
          <p className="e-text-xs e-mt-12 e-mb-0 e-flex e-align-center e-justify-center e-gap-4" style={{ color: 'var(--warning-500)' }}>
            <Sparkles style={{ height: '16px', width: '16px' }} />
            AI extraherar automatiskt timmar, pris och deadline
          </p>
        </div>
      </label>
    </div>
  );
}
