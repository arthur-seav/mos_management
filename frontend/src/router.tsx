import { createBrowserRouter } from 'react-router'

import AppLayout from '@/components/layout/AppLayout'
import OverviewPage from '@/pages/overview/OverviewPage'
import NotFoundPage from '@/pages/NotFoundPage'

export const router = createBrowserRouter([
  {
    element: <AppLayout />,
    children: [
      { index: true, element: <OverviewPage /> },
      { path: '*', element: <NotFoundPage /> }
    ]
  }
])
