import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

interface RouteParams {
  params: {
    id: string;
  };
}

// GET /api/cards/[id]/details - Get detailed information about a specific card
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const userId = request.headers.get('userId');
    const { id: cardId } = params;

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    const card = await db.card.findFirst({
      where: {
        id: cardId,
        list: {
          project: {
            ownerId: userId
          }
        }
      },
      include: {
        list: {
          include: {
            project: {
              select: {
                id: true,
                name: true,
                description: true
              }
            }
          }
        }
      }
    });

    if (!card) {
      return NextResponse.json(
        { error: 'Card not found or access denied' },
        { status: 404 }
      );
    }

    return NextResponse.json({ card });
  } catch (error) {
    console.error('Get card details error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}