import type { ReactNode } from 'react'
import { fireEvent, render, screen } from '@testing-library/react'
import Header from './Header'

const mockUseLocation = jest.fn(() => ({ pathname: '/' }))

jest.mock('react-router-dom', () => ({
  __esModule: true,
  Link: ({ children, to, ...props }: { children: ReactNode; to: string }) => (
    <a href={to} {...props}>
      {children}
    </a>
  ),
  useLocation: () => mockUseLocation(),
}))

jest.mock('../shared/ThemeToggle', () => ({
  __esModule: true,
  default: () => <div data-testid="theme-toggle" />,
}))

describe('Header', () => {
  it('renders navigation links and logo', () => {
    render(<Header />)

    expect(screen.getByRole('link', { name: /WaterLab Home/i })).toBeInTheDocument()
    expect(screen.getAllByRole('link', { name: /About/i })[0]).toHaveAttribute('href', '/')
    expect(screen.getAllByRole('link', { name: /Dashboard/i })[0]).toHaveAttribute('href', '/dashboard')
    expect(screen.getAllByRole('link', { name: /Data/i })[0]).toHaveAttribute('href', '/data')
    expect(screen.getByTestId('theme-toggle')).toBeInTheDocument()
  })

  it('toggles mobile navigation menu visibility', () => {
    render(<Header />)

    const menuButton = screen.getByRole('button', { name: /open navigation menu/i })
    expect(menuButton).toHaveAttribute('aria-expanded', 'false')
    expect(screen.queryByLabelText(/Mobile navigation/i)).not.toBeInTheDocument()

    fireEvent.click(menuButton)
    expect(menuButton).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getByLabelText(/Mobile navigation/i)).toBeInTheDocument()

    fireEvent.click(menuButton)
    expect(menuButton).toHaveAttribute('aria-expanded', 'false')
    expect(screen.queryByLabelText(/Mobile navigation/i)).not.toBeInTheDocument()
  })
})

