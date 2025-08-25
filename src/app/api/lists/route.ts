import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// POST /api/lists - Create a new list
export async function POST(request: NextRequest) {
  try {
    const userId = request.headers.get('userId');
    
    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    const { title, projectId } = await request.json();

    if (!title || !projectId) {
      return NextResponse.json(
        { error: 'Title and project ID are required' },
        { status: 400 }
      );
    }

    // Check if project exists and belongs to user
    const project = await db.project.findFirst({
      where: {
        id: projectId,
        ownerId: userId
      }
    });

    if (!project) {
      return NextResponse.json(
        { error: 'Project not found or access denied' },
        { status: 404 }
      );
    }

    // Get the highest position in the project to place the new list at the end
    const lastList = await db.list.findFirst({
      where: {
        projectId
      },
      orderBy: {
        position: 'desc'
      }
    });

    const position = lastList ? lastList.position + 1 : 0;

    const list = await db.list.create({
      data: {
        title,
        projectId,
        position
      },
      include: {
        cards: {
          orderBy: {
            position: 'asc'
          }
        }
      }
    });

    return NextResponse.json(
      { message: 'List created successfully', list },
      { status: 201 }
    );
  } catch (error) {
    console.error('Create list error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}