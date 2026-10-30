import { createBrowserRouter } from 'react-router'

import AppLayout from '@/components/layout/AppLayout'
import RequireAuth from '@/components/common/RequireAuth'
import ChangePasswordPage from '@/pages/account/ChangePasswordPage'
import LoginPage from '@/pages/auth/LoginPage'
import NotFoundPage from '@/pages/NotFoundPage'
import OverviewPage from '@/pages/overview/OverviewPage'

export const router = createBrowserRouter([
  { path: '/login', element: <LoginPage /> },
  {
    element: <RequireAuth />,
    children: [
      {
        element: <AppLayout />,
        children: [
          { index: true, element: <OverviewPage /> },
          { path: 'account/password', element: <ChangePasswordPage /> },
          { path: '*', element: <NotFoundPage /> }
        ]
      }
    ]
  }
])
