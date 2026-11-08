"""Crop complete source images without synthesizing or padding their edges."""
from prepare_portfolio_art import crop_source


def frame_banner(recipe, size):
    if recipe.get('framing', 'crop') != 'crop':
        raise ValueError('Choose a complete image that supports the banner crop. Background extension is not supported.')
    unsupported = [key for key in ('sourceBounds', 'subjectLighting', 'sourceGamma') if key in recipe]
    if unsupported:
        raise ValueError('Use the complete source and a natural crop; remove: ' + ', '.join(unsupported))
    return crop_source(recipe, size)
