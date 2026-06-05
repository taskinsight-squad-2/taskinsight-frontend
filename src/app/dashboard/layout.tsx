import VLibras from '@/components/VLibras'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <VLibras />
    </>
  )
}
