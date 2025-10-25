# SyncFusion Fluent2 - Styling Reference

**Skapad:** 2025-10-25 efter 4h ProjectDetailView-implementation
**Status:** Production-verified
**Källa:** SF official docs + hands-on learning

---

## 🎯 GRUNDLÄGGANDE SANNINGAR

### ❌ SF HAR INGA UTILITY-KLASSER FÖR LAYOUT

**Detta är den viktigaste lärdomen från hela sessionen.**

SyncFusion är INTE Tailwind CSS eller Bootstrap. SF tillhandahåller:
- ✅ Komponenter (Grid, Button, Card, etc)
- ✅ Component-specifika klasser (`e-btn`, `e-card`, `e-icons`)
- ❌ INGA generella utility-klasser för layout/spacing/typography

**Konsekvens:** Använd **inline styles** för all layout, precis som TestView.tsx gör.

---

## ✅ ÄKTA SF-KLASSER (Complete List)

### **Layout Components:**
```tsx
e-card                 // Card container
e-card-header          // Header section
e-card-title           // Title text
e-card-content         // Content section
e-card-actions         // Actions footer
```

### **Buttons:**
```tsx
e-btn                  // Base class
e-primary              // Blue (primary action)
e-success              // Green (confirm, complete)
e-danger               // Red (delete, error)
e-warning              // Orange (caution)
e-info                 // Blue (info)
e-outline              // Outline style
e-flat                 // Flat style (no border)
e-small                // Small button
```

### **Icons:**
```tsx
e-icons                // Base icon class (REQUIRED)
e-small                // 8px
e-medium               // 16px
e-large                // 24px
```

**Verified icon names (use with e-icons):**
- Actions: `e-check`, `e-plus`, `e-close`, `e-edit`, `e-trash`, `e-refresh`
- Navigation: `e-arrow-left`, `e-arrow-right`, `e-arrow-up`, `e-arrow-down`
- Objects: `e-user`, `e-folder`, `e-clock`, `e-date-occurring`
- Status: `e-warning`, `e-play`, `e-pause`

**517 ikoner finns totalt** - verifiera ALLTID innan användning!

### **Badges:**
```tsx
e-badge                // Base class (REQUIRED)
e-badge-primary        // Blue
e-badge-success        // Green
e-badge-danger         // Red
e-badge-warning        // Orange/Yellow
e-badge-info           // Cyan/Blue
e-badge-secondary      // Gray
e-badge-light          // Light gray
e-badge-dark           // Dark gray

// Shape modifiers
e-badge-pill           // Rounded pill shape
e-badge-circle         // Circle (för nummer/ikoner)
e-badge-dot            // Small dot indicator
e-badge-ghost          // Outline style

// Notification badges
e-badge-notification   // Position on element
e-badge-overlap        // Overlap parent element
```

**VIKTIGT:** Badge är CSS-only - ingen BadgeComponent finns! Använd `<span className="e-badge e-badge-pill e-badge-success">Text</span>`

---

## 🎨 STYLING APPROACH

### **1. Layout → Inline Styles**

All layout MÅSTE göras med inline styles:

```tsx
// Flexbox
<div style={{
  display: 'flex',
  flexDirection: 'row',      // eller 'column'
  alignItems: 'center',      // eller 'flex-start', 'flex-end'
  justifyContent: 'space-between',
  gap: '8px',
  flexWrap: 'wrap'
}}>

// Grid
<div style={{
  display: 'grid',
  gridTemplateColumns: 'repeat(2, 1fr)',
  gap: '16px'
}}>

// Spacing
<div style={{
  margin: '16px',
  marginBottom: '12px',
  padding: '12px',
  paddingTop: '8px'
}}>
```

### **2. Typography → Inline Styles**

```tsx
<h1 style={{
  fontSize: '24px',
  fontWeight: 'bold',
  margin: '0 0 4px 0',
  color: 'var(--color-sf-black)'
}}>

<span style={{
  fontSize: '14px',
  fontWeight: '600',
  color: 'var(--color-sf-black)',
  opacity: 0.6              // För subtle/secondary text
}}>

<p style={{
  fontSize: '12px',
  margin: '0 0 8px 0',
  color: 'var(--color-sf-black)',
  opacity: 0.5              // För labels
}}>
```

### **3. Colors → SF CSS Variables + Opacity**

**SF Fluent2 CSS Variables:**
```css
--color-sf-primary             /* #0f6cbd - Blue */
--color-sf-primary-light       /* #b4d6fa - Light blue */
--color-sf-primary-lighter     /* #ebf3fc - Lighter blue */
--color-sf-primary-dark        /* #0f548c - Dark blue */
--color-sf-primary-darker      /* #0c3b5e - Darker blue */

--color-sf-success             /* #0e700e - Green */
--color-sf-warning             /* #bc4b09 - Orange */
--color-sf-danger              /* #d13438 - Red */
--color-sf-info                /* #008aa9 - Cyan */

--color-sf-black               /* #000 - Black */
--color-sf-white               /* #fff - White */

--color-sf-border              /* Border color */
--color-sf-border-light        /* Light border */
```

**Opacity patterns:**
```tsx
// Primary text
color: 'var(--color-sf-black)'

// Secondary text (grå)
color: 'var(--color-sf-black)', opacity: 0.6

// Tertiary text (ljusgrå)
color: 'var(--color-sf-black)', opacity: 0.5

// Subtle hint (mycket ljus)
color: 'var(--color-sf-black)', opacity: 0.4

// Disabled
color: 'var(--color-sf-black)', opacity: 0.3
```

---

## 📦 COMPONENT PATTERNS (Verified)

### **ButtonComponent - ALLTID använd denna**

```tsx
import { ButtonComponent } from '@syncfusion/ej2-react-buttons';

// Basic
<ButtonComponent
  cssClass="e-primary"
  content="Spara"
  onClick={handleSave}
/>

// Med ikon
<ButtonComponent
  cssClass="e-success"
  iconCss="e-icons e-check"
  content="Slutför"
  onClick={handleComplete}
/>

// Ikon till höger
<ButtonComponent
  cssClass="e-outline"
  iconCss="e-icons e-arrow-right"
  iconPosition="Right"
  content="Nästa"
/>

// Liten knapp
<ButtonComponent
  cssClass="e-small e-outline"
  iconCss="e-icons e-refresh"
  onClick={handleRefresh}
/>

// Bred knapp
<ButtonComponent
  cssClass="e-primary"
  content="Fullbredd-knapp"
  style={{ width: '100%' }}
/>
```

**VIKTIGT:** Använd INTE native `<button className="e-btn">` - ButtonComponent ger:
- Ripple-effekt
- Konsekvent styling
- Touch-support
- Accessibility

### **Card Pattern**

```tsx
// Minimal card
<div className="e-card">
  <div className="e-card-content" style={{ padding: '12px' }}>
    {/* Content */}
  </div>
</div>

// Card med header
<div className="e-card">
  <div className="e-card-header">
    <div className="e-card-title">Rubrik</div>
  </div>
  <div className="e-card-content" style={{ padding: '12px' }}>
    {/* Content */}
  </div>
</div>

// Ultra-kompakt card (som Tid-card)
<div className="e-card">
  <div className="e-card-content" style={{ padding: '6px 10px 4px 10px' }}>
    {/* Minimal padding för tight layout */}
  </div>
</div>

// Klickbar card
<div
  className="e-card"
  style={{ cursor: 'pointer', transition: 'box-shadow 0.2s' }}
  onClick={handleClick}
  onMouseEnter={(e) => e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)'}
  onMouseLeave={(e) => e.currentTarget.style.boxShadow = 'none'}
>
  <div className="e-card-content" style={{ padding: '12px' }}>
    {/* Content */}
  </div>
</div>
```

### **SliderComponent**

```tsx
import { SliderComponent } from '@syncfusion/ej2-react-inputs';

<SliderComponent
  min={0}
  max={100}
  step={5}
  value={55}
  type="MinRange"           // VIKTIGT: Visar fylld track från 0 till value
  tooltip={{
    isVisible: true,
    placement: 'Before',
    showOn: 'Hover'         // Visa endast på hover (inte 'Always')
  }}
  change={(e: any) => handleChange(e.value)}
  enabled={!isDisabled}
/>
```

**Native `<input type="range">` problem:**
- Ingen consistent Fluent2-styling
- Track kan vara osynlig
- Thumb kan vara fel storlek
- → Använd SliderComponent!

### **InPlaceEditorComponent**

```tsx
import { InPlaceEditorComponent } from '@syncfusion/ej2-react-inplace-editor';

// Text
<InPlaceEditorComponent
  mode="Inline"
  type="Text"
  value={text}
  emptyText="Click to edit"
  actionOnBlur="Submit"
  change={async (e: any) => await save(e.value)}
/>

// Numeric
<InPlaceEditorComponent
  mode="Inline"
  type="Numeric"
  value={number}
  model={{ min: 0, step: 0.5, format: 'N1' }}
  change={async (e: any) => await save(e.value)}
/>

// Date
<InPlaceEditorComponent
  mode="Inline"
  type="Date"
  value={date ? new Date(date) : null}
  emptyText="Välj datum"
  change={async (e: any) => {
    const dateValue = e.value ? new Date(e.value).toISOString().split('T')[0] : null;
    await save(dateValue);
  }}
/>
```

---

## 📐 SPACING GUIDELINES

**Från ProjectDetailView (verified att fungera väl):**

### **Card Padding:**
```tsx
// Ultra-kompakt (progress slider)
style={{ padding: '6px 10px 4px 10px' }}

// Kompakt (standard)
style={{ padding: '12px' }}

// Normal
style={{ padding: '16px' }}

// Luftig (sällan)
style={{ padding: '24px' }}
```

### **Margins:**
```tsx
// Mellan sektioner
marginBottom: '16px'

// Mellan cards
marginBottom: '16px'

// Mindre gap
marginBottom: '12px'

// Inuti card
marginBottom: '4px'    // Labels
marginBottom: '8px'    // Element
```

### **Gaps:**
```tsx
// Tight (mellan små ikoner/text)
gap: '4px'

// Mellan knappar
gap: '8px'

// Mellan metadata
gap: '12px'

// Mellan cards/sektioner
gap: '16px'
```

---

## 🎨 TYPOGRAPHY SCALE

**Från ProjectDetailView (konsekvent användning):**

```tsx
// Labels (subtle, med opacity)
fontSize: '11px', opacity: 0.5

// Small text
fontSize: '12px'

// Normal text, metadata
fontSize: '14px'

// Emphasized text, medium numbers
fontSize: '16px'

// Large numbers
fontSize: '18px'

// Stats, key metrics
fontSize: '20px'

// Page headings
fontSize: '24px'
```

**Opacity patterns:**
```tsx
// Labels
opacity: 0.5

// Secondary metadata
opacity: 0.6

// Tertiary info (som Spiris ID)
opacity: 0.4
```

---

## 🧩 COMPLETE PATTERNS

### **Status Kanban Buttons**

```tsx
<div className="e-card">
  <div className="e-card-header">
    <div className="e-card-title">Status</div>
  </div>
  <div className="e-card-content" style={{ padding: '12px' }}>
    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
      <ButtonComponent
        onClick={() => setStatus('active')}
        cssClass={status === 'active' ? 'e-primary' : 'e-outline'}
        content="Aktiv"
      />
      <ButtonComponent
        onClick={() => setStatus('completed')}
        cssClass={status === 'completed' ? 'e-success' : 'e-success e-outline'}
        iconCss="e-icons e-check"
        content="Slutförd"
      />
      <ButtonComponent
        onClick={() => setStatus('archived')}
        cssClass={status === 'archived' ? 'e-flat' : 'e-outline'}
        iconCss="e-icons e-folder"
        content="Arkiverad"
      />
    </div>
  </div>
</div>
```

**Pattern:** Fylld knapp när aktiv status, outline när inte.

### **Read-Only Stats (3 kolumner)**

```tsx
<div className="e-card">
  <div className="e-card-header">
    <div className="e-card-title">Ekonomi</div>
  </div>
  <div className="e-card-content" style={{ padding: '12px' }}>
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(3, 1fr)',
      gap: '16px'
    }}>
      <div>
        <p style={{ fontSize: '12px', color: 'var(--color-sf-black)', opacity: 0.6, margin: '0 0 4px 0' }}>
          Label
        </p>
        <p style={{ fontSize: '20px', fontWeight: 'bold', margin: 0 }}>
          42h
        </p>
      </div>
      {/* Repeat för fler stats */}
    </div>
  </div>
</div>
```

### **Compact Slider with Labels**

```tsx
<div className="e-card">
  <div className="e-card-content" style={{ padding: '6px 10px 4px 10px' }}>
    {/* Labels */}
    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px' }}>
      <span style={{ fontSize: '11px', color: 'var(--color-sf-black)', opacity: 0.5 }}>
        Vänster label
      </span>
      <span style={{ fontSize: '11px', color: 'var(--color-sf-black)', opacity: 0.5 }}>
        Höger label
      </span>
    </div>

    {/* Values */}
    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
      <span style={{ fontSize: '16px', fontWeight: 'bold', color: 'var(--color-sf-primary)' }}>
        55%
      </span>
      <span style={{ fontSize: '16px', fontWeight: 'bold', color: 'var(--color-sf-primary-dark)' }}>
        18h
      </span>
    </div>

    {/* Slider */}
    <SliderComponent
      min={0}
      max={100}
      type="MinRange"
      value={55}
      tooltip={{ isVisible: true, showOn: 'Hover' }}
    />
  </div>
</div>
```

**Ultra-kompakt:** 3 rader (labels, values, slider), minimal padding.

### **Clickable Card List**

```tsx
<div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
  {items.map(item => (
    <div
      key={item.id}
      className="e-card"
      style={{ cursor: 'pointer', transition: 'box-shadow 0.2s' }}
      onClick={() => handleClick(item)}
      onMouseEnter={(e) => e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)'}
      onMouseLeave={(e) => e.currentTarget.style.boxShadow = 'none'}
    >
      <div className="e-card-content" style={{ padding: '12px' }}>
        <h3 style={{ fontWeight: '600', margin: '0 0 4px 0' }}>
          {item.title}
        </h3>
        <p style={{ fontSize: '14px', color: 'var(--color-sf-black)', opacity: 0.6, margin: 0 }}>
          {item.description}
        </p>
      </div>
    </div>
  ))}
</div>
```

**Hover-effekt:** box-shadow för att indikera klickbar.

---

## 🚨 COMMON PITFALLS - Undvik dessa!

### **1. Fake Utility Classes**

```tsx
// ❌ FEL - Dessa klasser gör INGENTING
<div className="e-flex e-gap-8 e-mb-16">
<span className="e-text-sm e-font-bold">Text</span>

// ✅ RÄTT - Inline styles
<div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
<span style={{ fontSize: '14px', fontWeight: 'bold' }}>Text</span>
```

### **2. Unverified Icons**

```tsx
// ❌ FEL - Ikonen finns inte
<span className="e-icons e-calendar"></span>

// ✅ RÄTT - Verifiera FÖRST
grep "e-calendar" node_modules/@syncfusion/ej2-icons/styles/fluent2.scss
// HITTAR INGET → använd e-date-occurring istället
<span className="e-icons e-medium e-date-occurring"></span>
```

### **3. Native Buttons**

```tsx
// ❌ FEL - Ingen ripple, dålig styling
<button className="e-btn e-primary">Spara</button>

// ✅ RÄTT - SF ButtonComponent
<ButtonComponent cssClass="e-primary" content="Spara" />
```

### **4. Custom CSS Variables**

```tsx
// ❌ FEL - Variablerna finns inte i SF
var(--e-text)
var(--e-surface-hover)
var(--primary-600)

// ✅ RÄTT - SF officiella variabler
var(--color-sf-black)
var(--color-sf-primary)
var(--color-sf-success)
```

---

## 🔍 VERIFICATION TOOLS

### **Verifiera Ikon:**
```bash
# Kolla om ikon finns
grep "e-my-icon" node_modules/@syncfusion/ej2-icons/styles/fluent2.scss

# Om hittas:
&.e-my-icon:before { content: "\e7b4"; }  ← Ikonen FINNS!

# Om inget resultat:
Ikonen finns INTE → hitta alternativ
```

### **Lista Alla Ikoner:**
```bash
grep -o "&\.e-[a-z-]*:" node_modules/@syncfusion/ej2-icons/styles/fluent2.scss | \
  sed 's/&\.//' | sed 's/://' | sort -u > /tmp/sf-icons.txt

# Sök i listan:
grep "calendar\|date\|time" /tmp/sf-icons.txt
```

### **Lista SF CSS Variables:**
```bash
grep -E "^\s*--color-sf-" node_modules/@syncfusion/ej2-base/styles/fluent2.css | head -30
```

---

## 📖 REFERENCE IMPLEMENTATIONS

**Kolla dessa filer för korrekt usage:**

1. **TestView.tsx** - Minimal referens-implementation
   - Endast äkta SF-klasser
   - Inline styles överallt
   - Kommentarer om vad som INTE fungerar

2. **ProjectDetailView.tsx** - Komplett exempel
   - ButtonComponent överallt
   - Verifierade ikoner
   - Card-struktur
   - Kompakt spacing
   - Read-only vs editable patterns

3. **ProjectProgressSlider.tsx** - Ultra-kompakt slider
   - SliderComponent implementation
   - 3-rads layout (labels, values, slider)
   - Minimal padding (6px 10px 4px 10px)

---

## ✅ STYLING CHECKLIST

Innan du börjar:
- [ ] Planerat card-struktur (inte custom divs)
- [ ] Planerat ButtonComponent (inte native buttons)
- [ ] Vet att inline styles är rätt approach
- [ ] Verifierat alla ikoner i fluent2.scss

Under kodning:
- [ ] Använder ButtonComponent för ALLA knappar
- [ ] Använder e-card för grupperad content
- [ ] Använder inline styles för layout/spacing/typography
- [ ] Använder SF CSS-variabler (--color-sf-*)
- [ ] Använder opacity för subtle text (inte custom färger)
- [ ] Lagt till icon size-klasser (e-small/medium/large)
- [ ] INGA påhittade klasser (e-mb-*, e-text-sm, etc)

Efter implementation:
- [ ] Layout fungerar (inga kollapsade sektioner)
- [ ] Ikoner syns (inte tomma fyrkanter)
- [ ] Knappar har ripple-effekt
- [ ] Spacing är kompakt (inte för luftigt)
- [ ] Färger är konsistenta (SF variables)

---

## 🎓 LÄRDOMAR FRÅN 4H DEBUGGING

**Problem:** ProjectDetailView hade helt kollapsad layout.

**Orsak:** Använde påhittade klasser (`e-flex`, `e-mb-16`, etc) som inte finns.

**Lösning:** Ersatte ALLA påhittade klasser med inline styles.

**Resultat:** Perfekt fungerande UI med korrekt Fluent2-styling.

**Tid spenderad:** 4 timmar på att fixa något som kunde undvikits genom att:
1. Läsa TestView.tsx FÖRST
2. Verifiera att klasser existerar FÖRE användning
3. Följa SF official docs (inte gissa)

**Key takeaway:** SF är INTE Tailwind. Inline styles är rätt approach för layout.

---

**Version:** 1.0 (Production-verified)
**Författare:** Efter 4h hands-on learning
**Status:** Detta är nu golden standard för all SF-styling i projektet
