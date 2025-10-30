/**
 * HomeView - Startsida med AI-chat och röstassistent
 */

import { PushToTalkAssistant } from '@/components/voice/PushToTalkAssistant';

export function HomeView() {
  return (
    <div style={{
      maxWidth: '600px',
      margin: '0 auto',
      display: 'flex',
      flexDirection: 'column',
      gap: '16px'
    }}>
      {/* AI Chat + Voice - Huvudfunktion */}
      <PushToTalkAssistant />
    </div>
  );
}
