import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { UserRole, UserStatus, MembershipTier } from '@prisma/client';

// GET - List users or get single user
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const role = searchParams.get('role');
    const status = searchParams.get('status');
    const isBlocked = searchParams.get('isBlocked');
    const search = searchParams.get('search');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const skip = (page - 1) * limit;

    if (id) {
      // Get single user
      const user = await db.user.findUnique({
        where: { id },
        include: {
          vehicles: true,
          documents: { take: 10, orderBy: { createdAt: 'desc' } },
          walletTransactions: { take: 10, orderBy: { createdAt: 'desc' } },
          _count: {
            select: {
              shipmentsAsSender: true,
              shipmentsAsCarrier: true,
              shipmentsAsDriver: true,
            }
          }
        }
      });

      if (!user) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
      }

      // Remove sensitive data
      const { passwordHash, ...safeUser } = user;
      return NextResponse.json(safeUser);
    }

    // Build filter conditions
    const where: any = {};

    if (role) {
      where.role = role as UserRole;
    }

    if (status) {
      where.status = status as UserStatus;
    }

    if (isBlocked !== null && isBlocked !== undefined) {
      where.isBlocked = isBlocked === 'true';
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { companyName: { contains: search, mode: 'insensitive' } },
      ];
    }

    // Get users with pagination
    const [users, total] = await Promise.all([
      db.user.findMany({
        where,
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          status: true,
          companyName: true,
          phone: true,
          membershipTier: true,
          walletBalance: true,
          isBlocked: true,
          blockReason: true,
          blockedAt: true,
          createdAt: true,
          lastLoginAt: true,
          _count: {
            select: {
              shipmentsAsSender: true,
              shipmentsAsCarrier: true,
              vehicles: true,
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      db.user.count({ where })
    ]);

    return NextResponse.json({
      users,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      }
    });

  } catch (error) {
    console.error('Users GET error:', error);
    return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 });
  }
}

// POST - Create new user
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      email,
      name,
      passwordHash,
      role,
      companyName,
      companyAddress,
      taxId,
      vatNumber,
      registrationNumber,
      phone,
      membershipTier,
      // Driver specific
      driverLicenseNumber,
      driverLicenseExpiry,
      driverLicenseClass,
    } = body;

    // Validate required fields
    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    // Check if user already exists
    const existingUser = await db.user.findUnique({ where: { email } });
    if (existingUser) {
      return NextResponse.json({ error: 'User with this email already exists' }, { status: 400 });
    }

    // Create user
    const user = await db.user.create({
      data: {
        email,
        name,
        passwordHash,
        role: role as UserRole || UserRole.DISPATCHER,
        status: UserStatus.PENDING,
        companyName,
        companyAddress,
        taxId,
        vatNumber,
        registrationNumber,
        phone,
        membershipTier: membershipTier as MembershipTier || MembershipTier.FREE,
        driverLicenseNumber,
        driverLicenseExpiry: driverLicenseExpiry ? new Date(driverLicenseExpiry) : null,
        driverLicenseClass,
      }
    });

    const { passwordHash: _, ...safeUser } = user;
    return NextResponse.json(safeUser, { status: 201 });

  } catch (error) {
    console.error('Users POST error:', error);
    return NextResponse.json({ error: 'Failed to create user' }, { status: 500 });
  }
}

// PUT - Update user
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, action, ...updateData } = body;

    if (!id) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    const user = await db.user.findUnique({ where: { id } });
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    let data: any = {};

    // Handle specific actions
    if (action) {
      switch (action) {
        case 'verify':
          data = { status: UserStatus.VERIFIED };
          break;
        case 'suspend':
          data = { status: UserStatus.SUSPENDED };
          break;
        case 'activate':
          data = { status: UserStatus.ACTIVE };
          break;
        case 'updateMembership':
          if (!updateData.membershipTier) {
            return NextResponse.json({ error: 'Membership tier required' }, { status: 400 });
          }
          data = {
            membershipTier: updateData.membershipTier as MembershipTier,
            membershipStart: new Date(),
            membershipEnd: updateData.membershipEnd ? new Date(updateData.membershipEnd) : null,
          };
          break;
        case 'updateWallet':
          if (typeof updateData.amount !== 'number') {
            return NextResponse.json({ error: 'Amount required' }, { status: 400 });
          }
          data = {
            walletBalance: user.walletBalance + updateData.amount,
          };
          break;
        case 'updateLocation':
          if (typeof updateData.lat !== 'number' || typeof updateData.lng !== 'number') {
            return NextResponse.json({ error: 'Lat/lng required' }, { status: 400 });
          }
          data = {
            currentLat: updateData.lat,
            currentLng: updateData.lng,
            lastLocationUpdate: new Date(),
          };
          break;
        default:
          return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
      }
    } else {
      // General update
      const allowedFields = [
        'name', 'companyName', 'companyAddress', 'taxId', 'vatNumber',
        'registrationNumber', 'phone', 'driverLicenseNumber', 'driverLicenseClass'
      ];

      for (const field of allowedFields) {
        if (updateData[field] !== undefined) {
          data[field] = updateData[field];
        }
      }

      // Admin-only fields
      if (updateData.role !== undefined) {
        data.role = updateData.role as UserRole;
      }
      if (updateData.status !== undefined) {
        data.status = updateData.status as UserStatus;
      }
      if (updateData.membershipTier !== undefined) {
        data.membershipTier = updateData.membershipTier as MembershipTier;
      }
      if (updateData.walletBalance !== undefined) {
        data.walletBalance = parseFloat(updateData.walletBalance);
      }

      // Blocking
      if (updateData.isBlocked !== undefined) {
        data.isBlocked = updateData.isBlocked;
        data.blockReason = updateData.blockReason || null;
        data.blockedAt = updateData.isBlocked ? new Date() : null;
      }

      if (updateData.driverLicenseExpiry) {
        data.driverLicenseExpiry = new Date(updateData.driverLicenseExpiry);
      }
    }

    const updatedUser = await db.user.update({
      where: { id },
      data,
    });

    const { passwordHash: _, ...safeUser } = updatedUser;
    return NextResponse.json(safeUser);

  } catch (error) {
    console.error('Users PUT error:', error);
    return NextResponse.json({ error: 'Failed to update user' }, { status: 500 });
  }
}

// DELETE - Delete user (soft delete by suspending)
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    const user = await db.user.findUnique({ where: { id } });
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Soft delete - just suspend
    await db.user.update({
      where: { id },
      data: { status: UserStatus.SUSPENDED }
    });

    return NextResponse.json({ success: true, message: 'User suspended' });

  } catch (error) {
    console.error('Users DELETE error:', error);
    return NextResponse.json({ error: 'Failed to delete user' }, { status: 500 });
  }
}
