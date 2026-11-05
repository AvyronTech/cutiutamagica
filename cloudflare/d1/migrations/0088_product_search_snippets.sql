PRAGMA foreign_keys = ON;

-- Improve factual search snippets only while the prior dashboard copy is unchanged.
-- Operators' newer edits take precedence over this migration.
UPDATE products SET
  seo_description='Cutiuță muzicală Harry Potter „I''m a Keeper” din lemn, cu manivelă și melodia Hedwig''s Theme. Fotografii, preț și disponibilitate.',
  version=version+1, updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now')
WHERE slug='hp-keeper' AND seo_description='Cutiuță din lemn închis, cu temă Harry Potter și manivelă. Pentru cineva care ține mereu puțină magie aproape.';

UPDATE products SET
  seo_description='Cutiuță muzicală Game of Thrones „Winter Is Coming” din lemn, cu manivelă. Cadou pentru fani fantasy; vezi fotografiile, prețul și stocul.',
  version=version+1, updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now')
WHERE slug='got-winter' AND seo_description='Cutiuță neagră din lemn, cu lup, mesaj tematic și manivelă. Un semn din Nord pentru cineva care iubește legendele.';

UPDATE products SET
  seo_description='Cutiuță muzicală cu pisicuță și lună, din lemn cu manivelă. Cadou pentru iubitorii de pisici; vezi fotografiile, melodia și disponibilitatea.',
  version=version+1, updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now')
WHERE slug='kitten' AND seo_description='Cutiuță din lemn deschis, cu pisicuță, lună și manivelă. O surpriză blândă pentru omul care iubește pisicile.';

UPDATE products SET
  seo_description='Cutiuță muzicală Halloween din lemn, cu manivelă și capac tematic. Cadou de sezon pentru fani și colecționari; vezi imaginile și disponibilitatea.',
  version=version+1, updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now')
WHERE slug='halloween' AND seo_description='Cutiuță din lemn cu ilustrație de Halloween și manivelă. Un strop de mister pentru serile de octombrie.';

UPDATE products SET
  seo_description='Cutiuță muzicală You Are My Sunshine din lemn, cu manivelă și mesaj sub capac. Cadou pentru mamă, partener sau cineva drag; vezi fotografiile și prețul.',
  version=version+1, updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now')
WHERE slug='sunshine' AND seo_description='Cutiuță din lemn închis, cu mesaj sub capac și manivelă. Pentru omul care îți luminează zilele.';

UPDATE products SET
  seo_description='Cutiuță muzicală Stăpânul Inelelor „One Ring” din lemn, cu manivelă. Cadou pentru fanii Tolkien și Lord of the Rings; vezi prețul și disponibilitatea.',
  version=version+1, updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now')
WHERE slug='lotr-rings' AND seo_description='Cutiuță din lemn cu decor inspirat de Inel și manivelă. Pentru cel care se întoarce mereu în Pământul de Mijloc.';

UPDATE products SET
  seo_description='Cutiuță muzicală Pirații din Caraibe din lemn, cu manivelă și ilustrație marină. Cadou pentru fanii Pirates of the Caribbean; vezi fotografiile și prețul.',
  version=version+1, updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now')
WHERE slug='pirates' AND seo_description='Cutiuță din lemn cu ilustrație marină și manivelă. Pentru cel care ar alege oricând o nouă aventură.';

UPDATE products SET
  seo_title='Cutiuță muzicală Pirații din Caraibe „Furtuna” | Cutiuța Magică',
  version=version+1, updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now')
WHERE slug='pirates' AND seo_title='Cutiuță muzicală Pirații Caraibilor „Furtuna” | Cutiuța Magică';

UPDATE schema_metadata
SET value='88', updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now')
WHERE key='schema_version';

PRAGMA optimize;
