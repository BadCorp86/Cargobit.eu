# CargoBit Developer Portal Komponentenbibliothek

**Dokument-Typ:** UI-Komponenten-Spezifikation  
**Version:** 1.0.0  
**Status:** Final  
**Letzte Aktualisierung:** 2024-01-15  
**Verantwortlich:** Frontend Team  

---

## Inhaltsverzeichnis

1. [Einführung](#1-einführung)
2. [Navigation-Komponenten](#2-navigation-komponenten)
3. [Content-Komponenten](#3-content-komponenten)
4. [Form-Komponenten](#4-form-komponenten)
5. [Tool-Komponenten](#5-tool-komponenten)
6. [Feedback-Komponenten](#6-feedback-komponenten)
7. [Layout-Komponenten](#7-layout-komponenten)
8. [Utility-Komponenten](#8-utility-komponenten)

---

## 1. Einführung

### 1.1 Zweck

Diese Komponentenbibliothek definiert alle wiederverwendbaren UI-Komponenten für das CargoBit Developer Portal. Sie dient als Referenz für Designer und Entwickler und stellt Konsistenz über alle Seiten sicher.

### 1.2 Komponenten-Philosophie

| Prinzip | Beschreibung |
|---------|--------------|
| **Modularität** | Jede Komponente ist eigenständig und wiederverwendbar |
| **Zusammensetzbarkeit** | Komplexe UIs werden aus einfachen Komponenten zusammengesetzt |
| **Konsistenz** | Gleiche Komponenten verhalten sich überall gleich |
| **Zugänglichkeit** | Alle Komponenten sind WCAG 2.1 AA konform |
| **Dokumentation** | Jede Komponente hat Props, States und Beispiele |

### 1.3 Technologie-Stack

| Technologie | Verwendung |
|-------------|------------|
| React 18+ | Komponenten-Framework |
| TypeScript | Typsicherheit |
| Tailwind CSS | Styling |
| Radix UI | Accessibility-Primitives |
| Lucide React | Icons |

---

## 2. Navigation-Komponenten

### 2.1 TopNavigation

Die TopNavigation ist die primäre Navigation, die auf allen Seiten sichtbar ist.

#### Props

| Prop | Typ | Default | Beschreibung |
|------|-----|---------|--------------|
| `items` | `NavItem[]` | `[]` | Navigationseinträge |
| `logo` | `ReactNode` | - | Logo-Element |
| `search` | `boolean` | `true` | Suchfeld anzeigen |
| `user` | `User \| null` | `null` | Aktueller Benutzer |

#### States

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                                                                             │
│  DEFAULT                                                                    │
│  [Logo]  Getting Started  API Reference  Tools  Guides  Architecture       │
│                                                                             │
│  HOVER                                                                      │
│  [Logo]  Getting Started  [API Reference]  Tools  Guides  Architecture     │
│                                   ─────────────                             │
│                                                                             │
│  ACTIVE                                                                     │
│  [Logo]  Getting Started  [API Reference]  Tools  Guides  Architecture     │
│                                   ═════════════                             │
│                                                                             │
│  MOBILE                                                                     │
│  [Logo]                                              [☰]  [Login]          │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

#### Code-Beispiel

```tsx
interface TopNavigationProps {
  items: NavItem[];
  logo?: ReactNode;
  search?: boolean;
  user?: User | null;
}

export function TopNavigation({ items, logo, search = true, user }: TopNavigationProps) {
  return (
    <header className="sticky top-0 z-50 bg-white border-b border-grey-200">
      <nav className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        <div className="flex items-center gap-8">
          {logo}
          <NavigationItems items={items} />
        </div>
        <div className="flex items-center gap-4">
          {search && <SearchButton />}
          {user ? <UserMenu user={user} /> : <LoginButton />}
        </div>
      </nav>
    </header>
  );
}
```

### 2.2 SidebarNavigation

Die SidebarNavigation zeigt die Struktur des aktuellen Bereichs an.

#### Props

| Prop | Typ | Default | Beschreibung |
|------|-----|---------|--------------|
| `items` | `SidebarItem[]` | `[]` | Navigationseinträge |
| `activeId` | `string` | - | ID des aktiven Eintrags |
| `collapsed` | `boolean` | `false` | Sidebar eingeklappt |

#### States

```
┌─────────────────────┐
│                     │
│  EXPANDED           │
│  ─────────────────  │
│                     │
│  ▼ Payments API     │
│    POST /payments   │
│    GET /payments    │
│    Errors           │
│                     │
│  ▶ Wallet API       │
│  ▶ Webhook API      │
│                     │
├─────────────────────┤
│                     │
│  COLLAPSED          │
│  ─────────  [pin]   │
│                     │
│  [P]  [W]  [H]      │
│                     │
└─────────────────────┘
```

#### Code-Beispiel

```tsx
interface SidebarNavigationProps {
  items: SidebarItem[];
  activeId?: string;
  collapsed?: boolean;
  onToggle?: () => void;
}

export function SidebarNavigation({ items, activeId, collapsed, onToggle }: SidebarNavigationProps) {
  return (
    <aside className={cn(
      "h-screen sticky top-16 border-r border-grey-200 transition-all",
      collapsed ? "w-16" : "w-72"
    )}>
      <nav className="p-4">
        {items.map((item) => (
          <SidebarSection 
            key={item.id} 
            item={item} 
            activeId={activeId}
            collapsed={collapsed}
          />
        ))}
      </nav>
      <button onClick={onToggle} className="absolute bottom-4 right-4">
        {collapsed ? <ChevronRight /> : <ChevronLeft />}
      </button>
    </aside>
  );
}
```

### 2.3 Breadcrumbs

Breadcrumbs zeigen den aktuellen Navigationspfad an.

#### Props

| Prop | Typ | Default | Beschreibung |
|------|-----|---------|--------------|
| `items` | `BreadcrumbItem[]` | `[]` | Breadcrumb-Einträge |
| `separator` | `ReactNode` | `/` | Trennzeichen |

#### States

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                                                                             │
│  DEFAULT                                                                    │
│  API Reference / Payments API / POST /payments                             │
│                                                                             │
│  WITH HOME ICON                                                             │
│  🏠 / API Reference / Payments API / POST /payments                        │
│                                                                             │
│  TRUNCATED (Mobile)                                                         │
│  ... / Payments API / POST /payments                                       │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

#### Code-Beispiel

```tsx
interface BreadcrumbsProps {
  items: BreadcrumbItem[];
  separator?: ReactNode;
}

export function Breadcrumbs({ items, separator = <ChevronRight size={16} /> }: BreadcrumbsProps) {
  return (
    <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-sm">
      {items.map((item, index) => (
        <Fragment key={item.id}>
          {index > 0 && <span className="text-grey-400">{separator}</span>}
          {item.href ? (
            <Link href={item.href} className="text-grey-600 hover:text-primary">
              {item.label}
            </Link>
          ) : (
            <span className="text-grey-900 font-medium">{item.label}</span>
          )}
        </Fragment>
      ))}
    </nav>
  );
}
```

---

## 3. Content-Komponenten

### 3.1 CodeBlock

CodeBlock zeigt formatierten Code mit Syntax-Highlighting an.

#### Props

| Prop | Typ | Default | Beschreibung |
|------|-----|---------|--------------|
| `code` | `string` | - | Code-Inhalt |
| `language` | `string` | `text` | Programmiersprache |
| `filename` | `string` | - | Dateiname (optional) |
| `showLineNumbers` | `boolean` | `false` | Zeilennummern anzeigen |
| `showCopy` | `boolean` | `true` | Copy-Button anzeigen |
| `highlightLines` | `number[]` | - | Hervorgehobene Zeilen |

#### States

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                                                                             │
│  DEFAULT                                                                    │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ javascript                                        [Copy] [Raw]      │   │
│  ├─────────────────────────────────────────────────────────────────────┤   │
│  │ const payment = await cargobit.payments.create({                   │   │
│  │   amount: 1000,                                                     │   │
│  │   currency: 'EUR'                                                   │   │
│  │ });                                                                 │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  WITH LINE NUMBERS                                                          │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ javascript                                               [Copy]      │   │
│  ├─────────────────────────────────────────────────────────────────────┤   │
│  │ 1 │ const payment = await cargobit.payments.create({               │   │
│  │ 2 │   amount: 1000,                                                  │   │
│  │ 3 │   currency: 'EUR'                                                │   │
│  │ 4 │ });                                                              │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  HIGHLIGHTED LINES                                                          │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ 1 │ const payment = await cargobit.payments.create({               │   │
│  │ 2 │   amount: 1000,     ← highlighted (yellow background)           │   │
│  │ 3 │   currency: 'EUR'    ← highlighted                              │   │
│  │ 4 │ });                                                              │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

#### Code-Beispiel

```tsx
interface CodeBlockProps {
  code: string;
  language?: string;
  filename?: string;
  showLineNumbers?: boolean;
  showCopy?: boolean;
  highlightLines?: number[];
}

export function CodeBlock({ 
  code, 
  language = 'text', 
  filename,
  showLineNumbers = false,
  showCopy = true,
  highlightLines = []
}: CodeBlockProps) {
  const [copied, setCopied] = useState(false);
  
  const handleCopy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  
  return (
    <div className="rounded-lg overflow-hidden border border-grey-200">
      <div className="flex items-center justify-between px-4 py-2 bg-grey-100 border-b border-grey-200">
        <span className="text-sm text-grey-600">{language}</span>
        {showCopy && (
          <button onClick={handleCopy} className="text-sm text-grey-600 hover:text-primary">
            {copied ? <Check size={16} /> : <Copy size={16} />}
          </button>
        )}
      </div>
      <SyntaxHighlighter 
        language={language} 
        showLineNumbers={showLineNumbers}
        wrapLines={true}
        lineProps={(lineNumber) => ({
          className: highlightLines.includes(lineNumber) ? 'bg-yellow-100' : ''
        })}
      >
        {code}
      </SyntaxHighlighter>
    </div>
  );
}
```

### 3.2 Tabs

Tabs organisieren Inhalte in einem begrenzten Raum.

#### Props

| Prop | Typ | Default | Beschreibung |
|------|-----|---------|--------------|
| `items` | `TabItem[]` | `[]` | Tab-Einträge |
| `defaultValue` | `string` | - | Initial aktiver Tab |
| `onChange` | `(value: string) => void` | - | Tab-Change-Callback |
| `variant` | `'line' \| 'pill'` | `'line'` | Tab-Stil |

#### States

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                                                                             │
│  LINE VARIANT                                                               │
│  ┌───────────────────────────────────────────────────────────────────────┐ │
│  │ [cURL]──── [JavaScript]──── [Python]──── [Go]                         │ │
│  │ ═══════                                                                │ │
│  ├───────────────────────────────────────────────────────────────────────┤ │
│  │                                                                       │ │
│  │  curl -X POST https://api.cargobit.io/v1/payments \                  │ │
│  │    -H "Authorization: Bearer YOUR_KEY" \                              │ │
│  │    -d '{"amount": 1000}'                                              │ │
│  │                                                                       │ │
│  └───────────────────────────────────────────────────────────────────────┘ │
│                                                                             │
│  PILL VARIANT                                                               │
│  ┌───────────────────────────────────────────────────────────────────────┐ │
│  │ [cURL]  [JavaScript]  [Python]  [Go]                                  │ │
│  │ ═════════                                                             │ │
│  │                                                                       │ │
│  │  Content here...                                                      │ │
│  │                                                                       │ │
│  └───────────────────────────────────────────────────────────────────────┘ │
│                                                                             │
│  VERTICAL TABS                                                              │
│  ┌─────────────┬──────────────────────────────────────────────────────────┐│
│  │ Overview    │                                                         ││
│  │ ═════════   │  Overview content...                                    ││
│  │ Parameters  │                                                         ││
│  │ Response    │                                                         ││
│  │ Errors      │                                                         ││
│  └─────────────┴──────────────────────────────────────────────────────────┘│
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

#### Code-Beispiel

```tsx
interface TabsProps {
  items: TabItem[];
  defaultValue?: string;
  onChange?: (value: string) => void;
  variant?: 'line' | 'pill';
}

export function Tabs({ items, defaultValue, onChange, variant = 'line' }: TabsProps) {
  return (
    <TabsRoot defaultValue={defaultValue} onValueChange={onChange}>
      <TabsList className={cn(
        "flex",
        variant === 'line' ? "border-b border-grey-200" : "gap-2 p-1 bg-grey-100 rounded-lg"
      )}>
        {items.map((item) => (
          <TabsTrigger 
            key={item.value} 
            value={item.value}
            className={cn(
              variant === 'line' 
                ? "px-4 py-2 border-b-2 border-transparent data-[state=active]:border-primary"
                : "px-3 py-1 rounded-md data-[state=active]:bg-white data-[state=active]:shadow-sm"
            )}
          >
            {item.label}
          </TabsTrigger>
        ))}
      </TabsList>
      {items.map((item) => (
        <TabsContent key={item.value} value={item.value} className="mt-4">
          {item.content}
        </TabsContent>
      ))}
    </TabsRoot>
  );
}
```

### 3.3 Accordion

Accordion ermöglicht das Ein- und Ausklappen von Inhaltsbereichen.

#### Props

| Prop | Typ | Default | Beschreibung |
|------|-----|---------|--------------|
| `items` | `AccordionItem[]` | `[]` | Accordion-Einträge |
| `type` | `'single' \| 'multiple'` | `'single'` | Ein/Mehrere offen |
| `defaultValue` | `string \| string[]` | - | Initial geöffnete Items |

#### States

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                                                                             │
│  COLLAPSED                                                                  │
│  ┌───────────────────────────────────────────────────────────────────────┐ │
│  │  ▶  What is CargoBit?                                                │ │
│  └───────────────────────────────────────────────────────────────────────┘ │
│                                                                             │
│  EXPANDED                                                                   │
│  ┌───────────────────────────────────────────────────────────────────────┐ │
│  │  ▼  What is CargoBit?                                                │ │
│  ├───────────────────────────────────────────────────────────────────────┤ │
│  │                                                                       │ │
│  │  CargoBit is a payment infrastructure platform that enables           │ │
│  │  businesses to integrate payment processing into their applications.  │ │
│  │                                                                       │ │
│  └───────────────────────────────────────────────────────────────────────┘ │
│                                                                             │
│  MULTIPLE EXPANDED (type="multiple")                                        │
│  ┌───────────────────────────────────────────────────────────────────────┐ │
│  │  ▼  What is CargoBit?                                                │ │
│  ├───────────────────────────────────────────────────────────────────────┤ │
│  │  Content...                                                           │ │
│  ├───────────────────────────────────────────────────────────────────────┤ │
│  │  ▼  How do I get started?                                            │ │
│  ├───────────────────────────────────────────────────────────────────────┤ │
│  │  Content...                                                           │ │
│  ├───────────────────────────────────────────────────────────────────────┤ │
│  │  ▶  What are the pricing plans?                                      │ │
│  └───────────────────────────────────────────────────────────────────────┘ │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 3.4 Card

Card gruppiert zusammengehörige Inhalte.

#### Props

| Prop | Typ | Default | Beschreibung |
|------|-----|---------|--------------|
| `title` | `string` | - | Titel |
| `description` | `string` | - | Beschreibung |
| `icon` | `ReactNode` | - | Icon |
| `action` | `ReactNode` | - | Aktions-Button |
| `hoverable` | `boolean` | `false` | Hover-Effekt |
| `clickable` | `boolean` | `false` | Klickbar |

#### Variants

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                                                                             │
│  DEFAULT CARD                                                               │
│  ┌───────────────────────────────────────────────────────────────────────┐ │
│  │                                                                       │ │
│  │  Card Title                                                    Action │ │
│  │  ───────────                                                           │ │
│  │                                                                       │ │
│  │  Card description that provides context about the content.            │ │
│  │                                                                       │ │
│  │  [Button]                                                             │ │
│  │                                                                       │ │
│  └───────────────────────────────────────────────────────────────────────┘ │
│                                                                             │
│  CARD WITH ICON                                                             │
│  ┌───────────────────────────────────────────────────────────────────────┐ │
│  │                                                                       │ │
│  │  📚 Quickstart                                                       │ │
│  │  ────────────                                                         │ │
│  │                                                                       │ │
│  │  Get started with our 5-minute integration guide.                    │ │
│  │                                                                       │ │
│  │                                              [Start →]                │ │
│  │                                                                       │ │
│  └───────────────────────────────────────────────────────────────────────┘ │
│                                                                             │
│  METRIC CARD                                                                │
│  ┌─────────────────────┐                                                   │
│  │                     │                                                   │
│  │  API Calls          │                                                   │
│  │  ──────────         │                                                   │
│  │                     │                                                   │
│  │  12,453             │                                                   │
│  │  +15% ↑            │                                                   │
│  │                     │                                                   │
│  └─────────────────────┘                                                   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 4. Form-Komponenten

### 4.1 Input

Input ist das Standard-Eingabefeld für Text.

#### Props

| Prop | Typ | Default | Beschreibung |
|------|-----|---------|--------------|
| `label` | `string` | - | Label-Text |
| `placeholder` | `string` | - | Placeholder |
| `helper` | `string` | - | Helper-Text |
| `error` | `string` | - | Error-Message |
| `disabled` | `boolean` | `false` | Deaktiviert |
| `type` | `string` | `'text'` | Input-Typ |

#### States

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                                                                             │
│  DEFAULT                                                                    │
│  Label                                                                      │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  Placeholder text                                                   │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│  Helper text                                                                │
│                                                                             │
│  FOCUS                                                                      │
│  Label                                                                      │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  Entered text|                                                      │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│  (blue border)                                                              │
│                                                                             │
│  ERROR                                                                      │
│  Label                                                                      │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  Invalid value                                                      │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│  ⚠️ This field is required                                                  │
│                                                                             │
│  DISABLED                                                                   │
│  Label                                                                      │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  Disabled field                                                     │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│  (grey background, no interaction)                                         │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 4.2 Select

Select ist ein Dropdown zur Auswahl aus einer Liste.

#### Props

| Prop | Typ | Default | Beschreibung |
|------|-----|---------|--------------|
| `options` | `SelectOption[]` | `[]` | Optionen |
| `placeholder` | `string` | `'Select...'` | Placeholder |
| `disabled` | `boolean` | `false` | Deaktiviert |
| `searchable` | `boolean` | `false` | Durchsuchbar |

#### States

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                                                                             │
│  CLOSED                                                                     │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  Select option...                                            [▼]   │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  OPEN                                                                       │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  Option 1                                                    [▲]   │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  Option 1                                                    ✓     │   │
│  │  Option 2                                                          │   │
│  │  Option 3                                                          │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  SEARCHABLE                                                                 │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  [🔍 Search...]                                              [▲]   │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  Option 1 (filtered)                                               │   │
│  │  Option 2 (filtered)                                               │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 4.3 Button

Button ist die primäre Aktionskomponente.

#### Props

| Prop | Typ | Default | Beschreibung |
|------|-----|---------|--------------|
| `variant` | `'primary' \| 'secondary' \| 'ghost' \| 'danger'` | `'primary'` | Stil |
| `size` | `'sm' \| 'md' \| 'lg'` | `'md'` | Größe |
| `loading` | `boolean` | `false` | Ladezustand |
| `disabled` | `boolean` | `false` | Deaktiviert |
| `icon` | `ReactNode` | - | Icon |
| `iconPosition` | `'left' \| 'right'` | `'left'` | Icon-Position |

#### Variants & States

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                                                                             │
│  PRIMARY                                                                    │
│  [Primary Button]  [Hover: Darker]  [Active: Even Darker]                  │
│  [Disabled (opacity: 0.5)]                                                 │
│  [Loading... ⟳]                                                            │
│                                                                             │
│  SECONDARY                                                                  │
│  [Secondary Button]  (border, transparent bg)                              │
│                                                                             │
│  GHOST                                                                      │
│  [Ghost Button]  (no border, transparent bg)                               │
│                                                                             │
│  DANGER                                                                     │
│  [Delete]  (red background)                                                │
│                                                                             │
│  SIZES                                                                      │
│  [Small]  [Medium]  [Large]                                                │
│    32px     40px      48px                                                 │
│                                                                             │
│  WITH ICON                                                                  │
│  [🔍 Search]  [Continue →]  [↑↑ Move Up]                                  │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 5. Tool-Komponenten

### 5.1 APIExplorer

Der APIExplorer ermöglicht das Testen von API-Endpunkten direkt im Browser.

#### Props

| Prop | Typ | Default | Beschreibung |
|------|-----|---------|--------------|
| `endpoint` | `string` | - | API-Endpunkt |
| `method` | `HttpMethod` | `'GET'` | HTTP-Methode |
| `environment` | `'sandbox' \| 'production'` | `'sandbox'` | Umgebung |

#### Structure

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                                                                             │
│  ┌───────────────────────────────────────────────────────────────────────┐ │
│  │                                                                       │ │
│  │  REQUEST                                         ENVIRONMENT          │ │
│  │  ───────                                         ───────────          │ │
│  │                                                                       │ │
│  │  [POST ▼]    [/payments]                     [Sandbox ●] [Prod ○]    │ │
│  │                                                                       │ │
│  │  Headers                                              [Add Header]   │ │
│  │  ────────                                                            │ │
│  │  Authorization    Bearer ••••••••••••                [×]              │ │
│  │  Content-Type     application/json                   [×]              │ │
│  │                                                                       │ │
│  │  Body                                                 [JSON] [Form]  │ │
│  │  ────                                                                 │ │
│  │  ┌─────────────────────────────────────────────────────────────────┐ │ │
│  │  │ {                                                               │ │ │
│  │  │   "amount": 1000,                                               │ │ │
│  │  │   "currency": "EUR"                                             │ │ │
│  │  │ }                                                               │ │ │
│  │  └─────────────────────────────────────────────────────────────────┘ │ │
│  │                                                                       │ │
│  │  [Beautify]  [Clear]                        [Send Request →]         │ │
│  │                                                                       │ │
│  └───────────────────────────────────────────────────────────────────────┘ │
│                                                                             │
│  ┌───────────────────────────────────────────────────────────────────────┐ │
│  │                                                                       │ │
│  │  RESPONSE                                 Time: 45ms  ID: pay_abc    │ │
│  │  ────────                                                              │ │
│  │                                                                       │ │
│  │  Status: 200 OK                                                       │ │
│  │                                                                       │ │
│  │  ┌─────────────────────────────────────────────────────────────────┐ │ │
│  │  │ {                                                               │ │ │
│  │  │   "id": "pay_abc123",                                           │ │ │
│  │  │   "status": "created",                                          │ │ │
│  │  │   "amount": 1000                                                │ │ │
│  │  │ }                                                               │ │ │
│  │  └─────────────────────────────────────────────────────────────────┘ │ │
│  │                                                                       │ │
│  │  [Copy]  [View in Docs]  [Save to History]                          │ │
│  │                                                                       │ │
│  └───────────────────────────────────────────────────────────────────────┘ │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 5.2 WebhookSimulator

Der WebhookSimulator ermöglicht das Testen von Webhook-Integrationen.

#### Props

| Prop | Typ | Default | Beschreibung |
|------|-----|---------|--------------|
| `eventTypes` | `EventType[]` | `[]` | Verfügbare Event-Typen |
| `defaultUrl` | `string` | - | Standard-Webhook-URL |

#### Structure

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                                                                             │
│  ┌───────────────────────────────────────────────────────────────────────┐ │
│  │                                                                       │ │
│  │  WEBHOOK SIMULATOR                                                   │ │
│  │                                                                       │ │
│  │  Event Type                                                          │ │
│  │  ┌───────────────────────────────────────────────────────────────┐   │ │
│  │  │  payment.created                                          [▼]   │   │ │
│  │  └───────────────────────────────────────────────────────────────┘   │ │
│  │                                                                       │ │
│  │  Target URL                                                          │ │
│  │  ┌───────────────────────────────────────────────────────────────┐   │ │
│  │  │  https://your-server.com/webhooks/cargobit                    │   │ │
│  │  └───────────────────────────────────────────────────────────────┘   │ │
│  │                                                                       │ │
│  │  Event Payload                                          [Generate]  │ │
│  │  ┌───────────────────────────────────────────────────────────────┐   │ │
│  │  │  {                                                            │   │ │
│  │  │    "id": "evt_abc123",                                        │   │ │
│  │  │    "type": "payment.created",                                 │   │ │
│  │  │    "data": { ... }                                            │   │ │
│  │  │  }                                                            │   │ │
│  │  └───────────────────────────────────────────────────────────────┘   │ │
│  │                                                                       │ │
│  │  Signature Preview                                                   │ │
│  │  ┌───────────────────────────────────────────────────────────────┐   │ │
│  │  │  X-CargoBit-Signature: t=1705315800,v1=abc123...             │   │ │
│  │  └───────────────────────────────────────────────────────────────┘   │ │
│  │                                                                       │ │
│  │  [Send Webhook →]                                                    │ │
│  │                                                                       │ │
│  └───────────────────────────────────────────────────────────────────────┘ │
│                                                                             │
│  ┌───────────────────────────────────────────────────────────────────────┐ │
│  │                                                                       │ │
│  │  DELIVERY RESULT                                                     │ │
│  │                                                                       │ │
│  │  ✓ Delivered (200 OK)                        Duration: 125ms         │ │
│  │                                                                       │ │
│  │  Response Body                                                       │ │
│  │  ┌───────────────────────────────────────────────────────────────┐   │ │
│  │  │  { "received": true }                                         │   │ │
│  │  └───────────────────────────────────────────────────────────────┘   │ │
│  │                                                                       │ │
│  │  [Replay Event]  [View in Logs]                                      │ │
│  │                                                                       │ │
│  └───────────────────────────────────────────────────────────────────────┘ │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 5.3 SchemaViewer

Der SchemaViewer zeigt Datenbank-Strukturen an.

#### Props

| Prop | Typ | Default | Beschreibung |
|------|-----|---------|--------------|
| `schema` | `SchemaDefinition` | - | Schema-Definition |
| `view` | `'table' \| 'diagram'` | `'table'` | Ansichtsmodus |

#### Structure

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                                                                             │
│  [Table View]  [ER Diagram]                                                │
│                                                                             │
│  ┌───────────────────────────────────────────────────────────────────────┐ │
│  │                                                                       │ │
│  │  payments                                                             │ │
│  │  ────────                                                             │ │
│  │                                                                       │ │
│  │  ┌────────────┬──────────┬────────┬──────────────────────────────┐   │ │
│  │  │ Column     │ Type     │ Null   │ Description                  │   │ │
│  │  ├────────────┼──────────┼────────┼──────────────────────────────┤   │ │
│  │  │ id         │ uuid     │ No     │ Primary key                  │   │ │
│  │  │ amount     │ integer  │ No     │ Amount in minor units        │   │ │
│  │  │ currency   │ char(3)  │ No     │ ISO 4217 currency code      │   │ │
│  │  │ status     │ enum     │ No     │ Payment status               │   │ │
│  │  │ wallet_id  │ uuid     │ Yes    │ FK → wallets.id              │   │ │
│  │  │ created_at │ datetime │ No     │ Creation timestamp           │   │ │
│  │  └────────────┴──────────┴────────┴──────────────────────────────┘   │ │
│  │                                                                       │ │
│  │  Indexes                                                             │ │
│  │  ───────                                                             │ │
│  │  • idx_payments_wallet_id (wallet_id)                                │ │
│  │  • idx_payments_status (status)                                      │ │
│  │  • idx_payments_created_at (created_at)                              │ │
│  │                                                                       │ │
│  └───────────────────────────────────────────────────────────────────────┘ │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 6. Feedback-Komponenten

### 6.1 Toast

Toast zeigt temporäre Benachrichtigungen an.

#### Props

| Prop | Typ | Default | Beschreibung |
|------|-----|---------|--------------|
| `message` | `string` | - | Nachricht |
| `type` | `'success' \| 'error' \| 'warning' \| 'info'` | `'info'` | Typ |
| `duration` | `number` | `5000` | Anzeigedauer (ms) |
| `action` | `ReactNode` | - | Aktions-Button |

#### Variants

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                                                                             │
│  SUCCESS                                                                    │
│  ┌───────────────────────────────────────────────────────────────────────┐ │
│  │  ✓  Payment created successfully                              [×]   │ │
│  └───────────────────────────────────────────────────────────────────────┘ │
│                                                                             │
│  ERROR                                                                      │
│  ┌───────────────────────────────────────────────────────────────────────┐ │
│  │  ✕  Failed to create payment                                  [×]   │ │
│  └───────────────────────────────────────────────────────────────────────┘ │
│                                                                             │
│  WARNING                                                                    │
│  ┌───────────────────────────────────────────────────────────────────────┐ │
│  │  ⚠  Rate limit approaching (80% used)              [View Details]   │ │
│  └───────────────────────────────────────────────────────────────────────┘ │
│                                                                             │
│  INFO                                                                       │
│  ┌───────────────────────────────────────────────────────────────────────┐ │
│  │  ℹ  New version available                                     [×]   │ │
│  └───────────────────────────────────────────────────────────────────────┘ │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 6.2 Alert

Alert zeigt persistente Nachrichten innerhalb der Seite an.

#### Props

| Prop | Typ | Default | Beschreibung |
|------|-----|---------|--------------|
| `title` | `string` | - | Titel |
| `message` | `string` | - | Nachricht |
| `type` | `'success' \| 'error' \| 'warning' \| 'info'` | `'info'` | Typ |
| `dismissible` | `boolean` | `false` | Schließbar |

### 6.3 LoadingSkeleton

LoadingSkeleton zeigt Platzhalter während des Ladens an.

#### Props

| Prop | Typ | Default | Beschreibung |
|------|-----|---------|--------------|
| `variant` | `'text' \| 'title' \| 'avatar' \| 'image' \| 'card'` | `'text'` | Typ |
| `count` | `number` | `1` | Anzahl |
| `animated` | `boolean` | `true` | Animation |

#### Variants

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                                                                             │
│  TEXT                                                                       │
│  ████████████████████████████████                                          │
│  ███████████████████████                                                    │
│  █████████████████████████████████████                                      │
│                                                                             │
│  TITLE                                                                      │
│  ████████████████████████                                                   │
│  ██████████████                                                            │
│                                                                             │
│  CARD                                                                       │
│  ┌───────────────────────────────────────────────────────────────────────┐ │
│  │  ████████████████                                                      │ │
│  │  ██████████████████████████████████████████████████████████████████   │ │
│  │  ██████████████████████████████████████████████████████████            │ │
│  │  ████████████████████████████                                          │ │
│  └───────────────────────────────────────────────────────────────────────┘ │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 7. Layout-Komponenten

### 7.1 PageLayout

PageLayout definiert die grundlegende Seitenstruktur.

#### Props

| Prop | Typ | Default | Beschreibung |
|------|-----|---------|--------------|
| `sidebar` | `ReactNode` | - | Sidebar-Inhalt |
| `toc` | `ReactNode` | - | Table of Contents |
| `children` | `ReactNode` | - | Hauptinhalt |
| `fullWidth` | `boolean` | `false` | Volle Breite |

### 7.2 Container

Container begrenzt die maximale Breite des Inhalts.

#### Props

| Prop | Typ | Default | Beschreibung |
|------|-----|---------|--------------|
| `maxWidth` | `'sm' \| 'md' \| 'lg' \| 'xl' \| 'full'` | `'lg'` | Maximale Breite |
| `padding` | `boolean` | `true` | Padding hinzufügen |

---

## 8. Utility-Komponenten

### 8.1 Badge

Badge zeigt kurze Status- oder Kategorie-Informationen.

#### Props

| Prop | Typ | Default | Beschreibung |
|------|-----|---------|--------------|
| `variant` | `'default' \| 'success' \| 'warning' \| 'error' \| 'info'` | `'default'` | Typ |
| `size` | `'sm' \| 'md'` | `'sm'` | Größe |

#### Variants

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                                                                             │
│  DEFAULT     [API Reference]  [Guide]  [Tool]                              │
│                                                                             │
│  SUCCESS     [Active]  [Published]  [Verified]                             │
│                                                                             │
│  WARNING     [Deprecated]  [Pending]  [Draft]                              │
│                                                                             │
│  ERROR       [Failed]  [Error]  [Rejected]                                 │
│                                                                             │
│  INFO        [New]  [Beta]  [Experimental]                                 │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 8.2 Tooltip

Tooltip zeigt zusätzliche Informationen beim Hover an.

#### Props

| Prop | Typ | Default | Beschreibung |
|------|-----|---------|--------------|
| `content` | `ReactNode` | - | Tooltip-Inhalt |
| `position` | `'top' \| 'right' \| 'bottom' \| 'left'` | `'top'` | Position |
| `delay` | `number` | `200` | Verzögerung (ms) |

### 8.3 EmptyState

EmptyState zeigt eine Nachricht an, wenn keine Daten vorhanden sind.

#### Props

| Prop | Typ | Default | Beschreibung |
|------|-----|---------|--------------|
| `icon` | `ReactNode` | - | Icon |
| `title` | `string` | - | Titel |
| `description` | `string` | - | Beschreibung |
| `action` | `ReactNode` | - | Aktions-Button |

#### Structure

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                                                                             │
│                                                                             │
│                                    📭                                       │
│                                                                             │
│                           No API calls yet                                  │
│                                                                             │
│          Make your first API call to see it appear here.                   │
│                                                                             │
│                          [Make First Call →]                               │
│                                                                             │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Anhang

### A. Komponenten-Index

| Komponente | Kategorie | Beschreibung |
|------------|-----------|--------------|
| TopNavigation | Navigation | Hauptnavigation |
| SidebarNavigation | Navigation | Seiten-Navigation |
| Breadcrumbs | Navigation | Navigationspfad |
| CodeBlock | Content | Code-Anzeige |
| Tabs | Content | Tab-Navigation |
| Accordion | Content | Aufklapp-Bereiche |
| Card | Content | Inhalts-Karte |
| Input | Form | Text-Eingabe |
| Select | Form | Dropdown-Auswahl |
| Button | Form | Aktions-Button |
| APIExplorer | Tool | API-Tester |
| WebhookSimulator | Tool | Webhook-Tester |
| SchemaViewer | Tool | Schema-Anzeige |
| Toast | Feedback | Temporäre Nachricht |
| Alert | Feedback | Persistente Nachricht |
| LoadingSkeleton | Feedback | Lade-Platzhalter |
| PageLayout | Layout | Seiten-Struktur |
| Container | Layout | Breiten-Begrenzung |
| Badge | Utility | Status-Anzeige |
| Tooltip | Utility | Hover-Info |
| EmptyState | Utility | Leerer Zustand |

### B. Accessibility-Checkliste

- [ ] Alle interaktiven Elemente sind per Tastatur erreichbar
- [ ] Fokus-Indikatoren sind sichtbar
- [ ] ARIA-Labels sind vorhanden
- [ ] Farbkontrast erfüllt WCAG AA
- [ ] Screenreader-Test durchgeführt
- [ ] Touch-Targets sind mindestens 44x44px

### C. Testing-Strategie

| Test-Typ | Werkzeug | Abdeckung |
|----------|----------|-----------|
| Unit Tests | Jest + Testing Library | Alle Komponenten |
| Visual Regression | Chromatic | Alle States |
| Accessibility | axe-core | Alle interaktiven Komponenten |
| E2E | Playwright | Kritische User Flows |

---

**Dokument-Ende**

*Diese Komponentenbibliothek wird kontinuierlich erweitert. Bei Fragen wende dich an das Frontend Team.*
