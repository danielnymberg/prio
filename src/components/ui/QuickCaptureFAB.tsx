import { SpeedDialComponent, SpeedDialItemModel } from '@syncfusion/ej2-react-buttons';

export function QuickCaptureFAB() {

  // Hide on desktop (lg breakpoint = 1024px)
  const isDesktop = window.matchMedia('(min-width: 1024px)').matches;
  if (isDesktop) return null;

  const items: SpeedDialItemModel[] = [
    {
      text: 'Ny uppgift',
      iconCss: 'e-icons e-plus',
      title: 'Skapa ny uppgift'
    },
    {
      text: 'Röstinmatning',
      iconCss: 'e-icons e-microphone',
      title: 'Starta röstassistent'
    }
  ];

  const handleClick = (args: any) => {
    const text = args.item.text;

    if (text === 'Ny uppgift') {
      // TaskForm removed
    } else if (text === 'Röstinmatning') {
      // Trigger voice interface
      window.dispatchEvent(new Event('trigger-voice'));
    }
  };

  return (
    <SpeedDialComponent
      items={items}
      position='BottomRight'
      openIconCss='e-icons e-plus'
      closeIconCss='e-icons e-close'
      cssClass='e-primary'
      modal={false}
      clicked={handleClick}
    />
  );
}
