// A small set of line icons, all drawn on the same 24px grid.
type Props = { className?: string };

function Icon({ className = "h-[18px] w-[18px]", children }: Props & { children: React.ReactNode }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {children}
    </svg>
  );
}

export const GridIcon = (p: Props) => <Icon {...p}><rect x="4" y="4" width="7" height="7" rx="2" /><rect x="13" y="4" width="7" height="7" rx="2" /><rect x="4" y="13" width="7" height="7" rx="2" /><rect x="13" y="13" width="7" height="7" rx="2" /></Icon>;
export const SalesIcon = (p: Props) => <Icon {...p}><path d="M4 19V5" /><path d="M4 19h16" /><path d="m8 15 3.5-4 3 2.5L20 7" /></Icon>;
export const BoxIcon = (p: Props) => <Icon {...p}><path d="m12 3 8 4.5v9L12 21l-8-4.5v-9L12 3Z" /><path d="m4 7.5 8 4.5 8-4.5" /><path d="M12 12v9" /></Icon>;
export const WalletIcon = (p: Props) => <Icon {...p}><path d="M4 7.5A2.5 2.5 0 0 1 6.5 5H18v3" /><rect x="4" y="8" width="16" height="11" rx="2.5" /><path d="M16.5 13.5h.01" /></Icon>;
export const UploadIcon = (p: Props) => <Icon {...p}><path d="M12 15V5" /><path d="m8 9 4-4 4 4" /><path d="M5 15v3a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-3" /></Icon>;
export const DownloadIcon = (p: Props) => <Icon {...p}><path d="M12 5v10" /><path d="m8 11 4 4 4-4" /><path d="M5 15v3a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-3" /></Icon>;
export const ReportIcon = (p: Props) => <Icon {...p}><path d="M7 3h7l5 5v11a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z" /><path d="M14 3v5h5" /><path d="M9 17v-3M12 17v-5M15 17v-2" /></Icon>;
export const SunIcon = (p: Props) => <Icon {...p}><circle cx="12" cy="12" r="4" /><path d="M12 3v1.5M12 19.5V21M3 12h1.5M19.5 12H21M5.6 5.6l1.1 1.1M17.3 17.3l1.1 1.1M5.6 18.4l1.1-1.1M17.3 6.7l1.1-1.1" /></Icon>;
export const MoonIcon = (p: Props) => <Icon {...p}><path d="M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5Z" /></Icon>;
export const GlobeIcon = (p: Props) => <Icon {...p}><circle cx="12" cy="12" r="8.5" /><path d="M3.5 12h17" /><path d="M12 3.5c2.5 2.4 3.6 5.3 3.6 8.5s-1.1 6.1-3.6 8.5c-2.5-2.4-3.6-5.3-3.6-8.5S9.500 5.900 12 3.500Z" /></Icon>;
export const CalendarIcon = (p: Props) => <Icon {...p}><rect x="4" y="5.500" width="16" height="14.500" rx="3" /><path d="M4 10h16M8.500 3.500v4M15.500 3.500v4" /></Icon>;
export const ChevronLeftIcon = (p: Props) => <Icon {...p}><path d="m14.500 6-6 6 6 6" /></Icon>;
export const ChevronRightIcon = (p: Props) => <Icon {...p}><path d="m9.500 6 6 6-6 6" /></Icon>;
export const ChevronDownIcon = (p: Props) => <Icon {...p}><path d="m6 9.500 6 6 6-6" /></Icon>;
export const SearchIcon = (p: Props) => <Icon {...p}><circle cx="11" cy="11" r="6.500" /><path d="m20 20-4.200-4.200" /></Icon>;
export const RefreshIcon = (p: Props) => <Icon {...p}><path d="M19.500 12a7.500 7.500 0 1 1-2.200-5.300L19.500 9" /><path d="M19.500 4.500V9H15" /></Icon>;
export const ArrowUpRightIcon = (p: Props) => <Icon {...p}><path d="M7.500 16.500 16.500 7.500" /><path d="M9 7.500h7.500V15" /></Icon>;
export const PencilIcon = (p: Props) => <Icon {...p}><path d="M4 20h4L19 9a2.100 2.100 0 0 0-3-3L5 17v3z" /><path d="m14.500 7.500 3 3" /></Icon>;
export const ClockIcon = (p: Props) => <Icon {...p}><circle cx="12" cy="12" r="8" /><path d="M12 7.500V12l3 2" /></Icon>;
export const LogOutIcon = (p: Props) => <Icon {...p}><path d="M14 4H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h7" /><path d="M10.500 12H20" /><path d="m17 9 3 3-3 3" /></Icon>;
export const MenuIcon = (p: Props) => <Icon {...p}><path d="M4 7.500h16M4 12h16M4 16.500h16" /></Icon>;
export const CloseIcon = (p: Props) => <Icon {...p}><path d="m6 6 12 12M18 6 6 18" /></Icon>;
export const CheckIcon = (p: Props) => <Icon {...p}><path d="m5 12.500 4.500 4.500L19 7.500" /></Icon>;
export const PlusIcon = (p: Props) => <Icon {...p}><path d="M12 5v14M5 12h14" /></Icon>;
export const TrendUpIcon = (p: Props) => <Icon {...p}><path d="m4 16 5.500-5.500 3.500 3.500L20 7" /><path d="M15 7h5v5" /></Icon>;
export const TrendDownIcon = (p: Props) => <Icon {...p}><path d="m4 8 5.500 5.500 3.500-3.500L20 17" /><path d="M15 17h5v-5" /></Icon>;
export const SidebarIcon = (p: Props) => <Icon {...p}><rect x="3.5" y="4.5" width="17" height="15" rx="3" /><path d="M9.5 4.5v15" /></Icon>;
export const ForecastIcon = (p: Props) => <Icon {...p}><path d="M4 19h16" /><path d="M4 15.500 9 10l3 2.500 3.500-4" /><path d="M15.500 8.500 20 4" strokeDasharray="2 2.500" /></Icon>;
export const EyeIcon = (p: Props) => <Icon {...p}><path d="M2.500 12S6 5.500 12 5.500 21.500 12 21.500 12 18 18.500 12 18.500 2.500 12 2.500 12Z" /><circle cx="12" cy="12" r="2.800" /></Icon>;
export const EyeOffIcon = (p: Props) => <Icon {...p}><path d="M9.900 5.800A9 9 0 0 1 12 5.500c6 0 9.500 6.500 9.500 6.500a17 17 0 0 1-2.800 3.600" /><path d="M6.400 7.100A16.500 16.500 0 0 0 2.500 12S6 18.500 12 18.500a9.200 9.200 0 0 0 4.900-1.400" /><path d="M10 10a2.800 2.800 0 0 0 4 4" /><path d="m4 4 16 16" /></Icon>;
export const TeamIcon = (p: Props) => <Icon {...p}><circle cx="9" cy="8.500" r="3.500" /><path d="M2.500 19.500c.8-3.500 3.300-5.500 6.500-5.500s5.700 2 6.500 5.500" /><path d="M15.500 5.300a3.500 3.500 0 0 1 0 6.400" /><path d="M18 14.500c1.800.8 3 2.500 3.500 5" /></Icon>;
export const FileIcon = (p: Props) => <Icon {...p}><path d="M7 3h7l5 5v11a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z" /><path d="M14 3v5h5" /></Icon>;
