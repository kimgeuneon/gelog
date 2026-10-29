import rss from '@astrojs/rss';
import { SITE_DESCRIPTION, SITE_TITLE } from '@/config/site';
import { getSortedPosts } from '@/shared/lib/posts';
import { postUrl } from '@/shared/lib/url';

export async function GET(context) {
	const posts = await getSortedPosts();
	return rss({
		title: SITE_TITLE,
		description: SITE_DESCRIPTION,
		site: context.site,
		items: posts.map((post) => ({ ...post.data, link: postUrl(post.id) })),
	});
}
