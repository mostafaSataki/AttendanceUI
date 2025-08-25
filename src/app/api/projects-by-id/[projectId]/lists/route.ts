import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

interface RouteParams {
  params: {
    projectId: string;
  };
}

// GET /api/projects-by-id/[projectId]/lists - Get all lists for a specific project
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const userId = request.headers.get('userId');
    const { projectId } = params;

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
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

    const lists = await db.list.findMany({
      where: {
        projectId
      },
      include: {
        cards: {
          orderBy: {
            position: 'asc'
          }
        }
      },
      orderBy: {
        position: 'asc'
      }
    });

    return NextResponse.json({ lists });
  } catch (error) {
    console.error('Get project lists error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/projects-by-id/[projectId]/lists - Create a new list in a specific project
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const userId = request.headers.get('userId');
    const { projectId } = params;

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    const { title } = await request.json();

    if (!title) {
      return NextResponse.json(
        { error: 'List title is required' },
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
    console.error('Create project list error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}