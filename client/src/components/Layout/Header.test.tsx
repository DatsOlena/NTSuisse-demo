import type { ReactNode } from 'react'
import { render, screen } from '@testing-library/react'
import Header from './Header'

jest.mock('react-router-dom', () => ({
  __esModule: true,
  Link: ({ children, to, ...props }: { children: ReactNode; to: string }) => (
    <a href={to} {...props}>
      {children}
    </a>
  ),
}))

jest.mock('../shared/ThemeToggle', () => ({
  __esModule: true,
  default: () => <div data-testid="theme-toggle" />,
}))

describe('Header', () => {
  it('renders navigation links and logo', () => {
    render(<Header />)

    expect(screen.getByRole('link', { name: /WaterLab Home/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /About/i })).toHaveAttribute('href', '/')
    expect(screen.getByRole('link', { name: /Dashboard/i })).toHaveAttribute('href', '/dashboard')
    expect(screen.getByRole('link', { name: /Data/i })).toHaveAttribute('href', '/data')
    expect(screen.getByTestId('theme-toggle')).toBeInTheDocument()
  })
})

