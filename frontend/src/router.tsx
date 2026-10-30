import { createBrowserRouter } from 'react-router'

import RequireAuth from '@/components/common/RequireAuth'
import AppLayout from '@/components/layout/AppLayout'
import ChangePasswordPage from '@/pages/account/ChangePasswordPage'
import CustomersPage from '@/pages/accounts/CustomersPage'
import StaffPage from '@/pages/accounts/StaffPage'
import LoginPage from '@/pages/auth/LoginPage'
import CategoriesPage from '@/pages/menu/CategoriesPage'
import OptionGroupsPage from '@/pages/menu/OptionGroupsPage'
import ProductEditPage from '@/pages/menu/ProductEditPage'
import ProductsPage from '@/pages/menu/ProductsPage'
import NotFoundPage from '@/pages/NotFoundPage'
import OrderQueuePage from '@/pages/orders/OrderQueuePage'
import OrderRecordsPage from '@/pages/orders/OrderRecordsPage'
import WalkInPage from '@/pages/orders/WalkInPage'
import OverviewPage from '@/pages/overview/OverviewPage'
import ReportsPage from '@/pages/reports/ReportsPage'
import StoreSettingsPage from '@/pages/store/StoreSettingsPage'

/** Admin-only pages are wrapped in RequireAuth roles={['admin']} (FR-05); the API checks again. */
export const router = createBrowserRouter([
  { path: '/login', element: <LoginPage /> },
  {
    element: <RequireAuth />,
    children: [
      {
        element: <AppLayout />,
        children: [
          { index: true, element: <OverviewPage /> },
          { path: 'orders/queue', element: <OrderQueuePage /> },
          { path: 'orders/new', element: <WalkInPage /> },
          { path: 'orders', element: <OrderRecordsPage /> },
          { path: 'menu/products', element: <ProductsPage /> },
          { path: 'store', element: <StoreSettingsPage /> },
          { path: 'account/password', element: <ChangePasswordPage /> },
          {
            element: <RequireAuth roles={['admin']} />,
            children: [
              { path: 'menu/products/new', element: <ProductEditPage /> },
              { path: 'menu/products/:id', element: <ProductEditPage /> },
              { path: 'menu/categories', element: <CategoriesPage /> },
              { path: 'menu/options', element: <OptionGroupsPage /> },
              { path: 'reports', element: <ReportsPage /> },
              { path: 'accounts/staff', element: <StaffPage /> },
              { path: 'accounts/customers', element: <CustomersPage /> }
            ]
          },
          { path: '*', element: <NotFoundPage /> }
        ]
      }
    ]
  }
])
