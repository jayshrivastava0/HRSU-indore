// import { HTMLRewriter } from 'html-rewriter-wasm';

class ReviewInjector {
  constructor(reviews, productGroupID) {
    this.reviews = reviews;
    this.productGroupID = productGroupID;
  }

  element(element) {
    // Build review cards HTML
    let reviewsHTML = '';

    if (this.reviews.length === 0) {
      reviewsHTML = '<p id="reviews-empty">No reviews yet — be the first to review this product.</p>';
    } else {
      reviewsHTML = this.reviews
        .map((review) => {
          const stars = '★'.repeat(review.rating) + '☆'.repeat(5 - review.rating);
          const date = new Date(review.created_at).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
          });
          return `
        <div style="border-bottom:1px solid #e2e8f0;padding:1.5rem 0;font-size:.95rem">
          <div style="display:flex;justify-content:space-between;align-items:start;margin-bottom:0.5rem">
            <div>
              <div style="color:#f59e0b;font-weight:600;margin-bottom:0.25rem">${stars}</div>
              <p style="margin:0;color:#1e293b;font-weight:600">${this.escapeHtml(review.name)}${review.city ? `, ${this.escapeHtml(review.city)}` : ''}</p>
            </div>
            <span style="color:#64748b;font-size:.85rem;white-space:nowrap">${date}</span>
          </div>
          <p style="margin:0.5rem 0 0 0;color:#334155;line-height:1.6">${this.escapeHtml(review.body)}</p>
        </div>
          `;
        })
        .join('');
    }

    element.setInnerHTML(reviewsHTML, { html: true });
  }

  escapeHtml(text) {
    if (!text) return '';
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }
}

class AggregateRatingInjector {
  constructor(reviews, productGroupID) {
    this.reviews = reviews;
    this.productGroupID = productGroupID;
  }

  element(element) {
    if (this.reviews.length === 0) {
      // No reviews, skip JSON-LD injection
      return;
    }

    const avgRating = (
      this.reviews.reduce((sum, r) => sum + r.rating, 0) / this.reviews.length
    ).toFixed(1);

    const aggregateRatingSchema = {
      '@type': 'AggregateRating',
      '@context': 'https://schema.org',
      ratingValue: parseFloat(avgRating),
      reviewCount: this.reviews.length,
      bestRating: 5,
      worstRating: 1,
    };

    // Append JSON-LD script to head
    const script = `
<script type="application/ld+json">
${JSON.stringify(aggregateRatingSchema)}
</script>
    `;

    element.append(script, { html: true });
  }
}

export async function onRequest(context) {
  const { request, env, params } = context;

  // Only handle GET requests
  if (request.method !== 'GET') {
    return env.ASSETS.fetch(request);
  }

  // Get the product page
  const response = await env.ASSETS.fetch(request);

  if (response.status !== 200 || !response.headers.get('content-type')?.includes('text/html')) {
    return response;
  }

  // Extract product_id from URL path (e.g., /store/calcium-nitrate-fertilizer-grade/ → HRSU-CN-001)
  const path = params.path ? params.path.join('/') : '';
  const productSlug = path.replace(/\/$/, '');

  // Map slug to product_id (for now, hardcoded; expand as needed)
  const slugToProductId = {
    'calcium-nitrate-fertilizer-grade': 'HRSU-CN-001',
  };

  const productId = slugToProductId[productSlug];

  // If no mapping, return unmodified response
  if (!productId) {
    return response;
  }

  // TODO: Fetch approved reviews from D1 once database is configured
  // For now, skip review injection and return the static page
  return response;
}
