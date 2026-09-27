const API_BASE = process.env.API_URL || 'https://dumuwaks.co.ke';

export async function fetchAPI<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
    next: { revalidate: 300 }, // Cache for 5 minutes
  });

  if (!res.ok) {
    throw new Error(`API error: ${res.status}`);
  }

  return res.json();
}

export async function getPublicStats() {
  try {
    return await fetchAPI<{
      success: boolean;
      data: {
        totalCustomers: number;
        totalTechnicians: number;
        activeTechnicians: number;
        totalBookings: number;
        averageRating: number;
        totalReviews: number;
      };
    }>('/api/public/stats');
  } catch {
    return null;
  }
}

export async function getPublicReviews(limit = 6) {
  try {
    return await fetchAPI<{
      success: boolean;
      data: Array<{
        _id: string;
        rating: number;
        comment: string;
        reviewer: { firstName: string; lastName: string };
        createdAt: string;
      }>;
    }>(`/api/public/reviews?limit=${limit}&minRating=4`);
  } catch {
    return null;
  }
}

export async function getPublicTechnicians(params?: {
  serviceCategory?: string;
  location?: string;
  limit?: number;
}) {
  try {
    const searchParams = new URLSearchParams();
    if (params?.serviceCategory) searchParams.set('serviceCategory', params.serviceCategory);
    if (params?.location) searchParams.set('location', params.location);
    if (params?.limit) searchParams.set('limit', params.limit.toString());

    return await fetchAPI<{
      success: boolean;
      data: Array<{
        _id: string;
        firstName: string;
        lastName: string;
        profilePicture?: string;
        serviceCategories: string[];
        location?: { city: string; county: string };
        availabilityStatus: string;
        publicStats: {
          jobsCompleted: number;
          averageRating: number;
          totalReviews: number;
        };
      }>;
    }>(`/api/public/technicians?${searchParams.toString()}`);
  } catch {
    return null;
  }
}

export async function getServiceCategories() {
  try {
    return await fetchAPI<{
      success: boolean;
      data: Array<{
        _id: string;
        name: string;
        slug: string;
        description: string;
        icon?: string;
        serviceCount?: number;
      }>;
    }>('/api/v1/services/categories');
  } catch {
    return null;
  }
}

export async function getPopularServices() {
  try {
    return await fetchAPI<{
      success: boolean;
      data: Array<{
        _id: string;
        name: string;
        category: string;
        description: string;
        basePrice: number;
      }>;
    }>('/api/v1/services/popular');
  } catch {
    return null;
  }
}
