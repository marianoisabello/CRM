import ChatBot from './components/ChatBot'
import CrmSidebar from './components/CrmSidebar'

export default function App() {
  return (
    <div className="min-h-screen flex" style={{ background: '#F8F9FA' }}>
      <CrmSidebar />
      <main className="flex-1 min-h-screen md:ml-56 flex items-center justify-center p-0 sm:p-4">
        <ChatBot />
      </main>
    </div>
  )
}
