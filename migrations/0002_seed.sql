-- Migration 0002: seed the 6 original Conteúdo cards as published posts.

INSERT INTO posts (id, title, tags, body_html, excerpt, read_minutes, status, created_at, updated_at, published_at, author_email)
VALUES
  ('seed-01-silencio',
   'O silêncio também comunica: quando não responder é estratégia.',
   '["Reputação","Ensaio"]',
   '<p>Placeholder. Edite este post no /admin para substituir o conteúdo.</p>',
   'Quando responder pode amplificar mais do que esclarecer.',
   6, 'published',
   1762400000000, 1762400000000, 1762400000000, NULL),

  ('seed-02-assessoria',
   'Para além do release: o que substitui a assessoria tradicional em 2026.',
   '["Comunicação","Análise"]',
   '<p>Placeholder. Edite este post no /admin para substituir o conteúdo.</p>',
   'O fim do disparo em massa e o que vem depois.',
   9, 'published',
   1762486400000, 1762486400000, 1762486400000, NULL),

  ('seed-03-offline',
   'O retorno do offline: por que mesa redonda voltou a ser mídia.',
   '["Tendências","Tendência"]',
   '<p>Placeholder. Edite este post no /admin para substituir o conteúdo.</p>',
   'Encontros pequenos como o novo palco da influência.',
   4, 'published',
   1762572800000, 1762572800000, 1762572800000, NULL),

  ('seed-04-herdeiros',
   'Reputação de herdeiros: o desafio de existir além do sobrenome.',
   '["Reputação","Ensaio"]',
   '<p>Placeholder. Edite este post no /admin para substituir o conteúdo.</p>',
   'A construção de uma marca pessoal sob o peso de uma marca familiar.',
   8, 'published',
   1762659200000, 1762659200000, 1762659200000, NULL),

  ('seed-05-discricao',
   'Discrição como vantagem competitiva em comunicação executiva.',
   '["Comunicação","Análise"]',
   '<p>Placeholder. Edite este post no /admin para substituir o conteúdo.</p>',
   'Por que aparecer menos pode valer mais.',
   7, 'published',
   1762745600000, 1762745600000, 1762745600000, NULL),

  ('seed-06-ia',
   'IA e autoria: o novo contrato entre lideranças e suas vozes.',
   '["Tendências","Tendência"]',
   '<p>Placeholder. Edite este post no /admin para substituir o conteúdo.</p>',
   'Onde fica a assinatura humana quando a máquina escreve junto.',
   5, 'published',
   1762832000000, 1762832000000, 1762832000000, NULL);
