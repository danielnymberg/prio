import { TooltipComponent } from '@syncfusion/ej2-react-popups';
import { ReactNode } from 'react';

interface TooltipProps {
  content: string;
  children: ReactNode;
  position?: 'TopCenter' | 'TopLeft' | 'TopRight' | 'BottomCenter' | 'BottomLeft' | 'BottomRight' | 'LeftCenter' | 'LeftTop' | 'LeftBottom' | 'RightCenter' | 'RightTop' | 'RightBottom';
}

export function Tooltip({ content, children, position = 'TopCenter' }: TooltipProps) {
  return (
    <TooltipComponent
      content={content}
      position={position}
      showTipPointer={true}
      animation={{
        open: { effect: 'FadeIn', duration: 150 },
        close: { effect: 'FadeOut', duration: 150 },
      }}
      cssClass="custom-tooltip"
    >
      {children}
    </TooltipComponent>
  );
}
