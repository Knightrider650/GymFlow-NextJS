import { describe, it, expect } from 'vitest'
import {
  ROLE_HIERARCHY,
  canManageRole,
  getCreatableRoles,
  canAccessRoute,
  isTrainer,
  asUserRole,
  ROUTE_PERMISSIONS,
  ELEVATED_ROLES,
} from '../lib/permissions'

describe('permissions helpers', () => {
  it('ROLE_HIERARCHY has expected roles and ordering', () => {
    expect(ROLE_HIERARCHY).toHaveProperty('cto')
    expect(ROLE_HIERARCHY).toHaveProperty('ceo')
    expect(ROLE_HIERARCHY.cto).toBeGreaterThan(ROLE_HIERARCHY.admin)
  })

  it('canManageRole returns true only for higher roles', () => {
    expect(canManageRole('admin', 'manager')).toBe(true)
    expect(canManageRole('manager', 'admin')).toBe(false)
    expect(canManageRole('admin', 'admin')).toBe(false)
  })

  it('getCreatableRoles returns roles lower than actor', () => {
    const creatable = getCreatableRoles('manager')
    expect(creatable).toContain('staff')
    expect(creatable).toContain('trainer')
    expect(creatable).not.toContain('admin')
  })

  it('route permission map enforces visibility', () => {
    // Quick sanity: '/staff-hr' is only for elevated roles
    expect(ROUTE_PERMISSIONS['/staff-hr']).toBeDefined()
    expect(canAccessRoute('manager', '/staff-hr')).toBe(true)
    expect(canAccessRoute('trainer', '/staff-hr')).toBe(false)
  })

  it('isTrainer and asUserRole behave as expected', () => {
    expect(isTrainer('trainer')).toBe(true)
    expect(isTrainer('staff')).toBe(false)
    expect(asUserRole('admin')).toBe('admin')
    expect(asUserRole('unknown-role')).toBeUndefined()
  })

  it('ELEVATED_ROLES contains expected items', () => {
    expect(ELEVATED_ROLES).toContain('admin')
    expect(ELEVATED_ROLES).toContain('manager')
  })
})
