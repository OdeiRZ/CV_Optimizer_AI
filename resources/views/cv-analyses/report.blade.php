<?php $isEnglish = $analysis->language->value === 'en'; ?>
<!DOCTYPE html>
<html lang="{{ $analysis->language->value }}">
<head>
    <meta charset="utf-8">
    <title>{{ $isEnglish ? 'CV Analysis Report' : 'Informe de análisis de CV' }}</title>
    <style>
        body {
            font-family: 'DejaVu Sans', sans-serif;
            color: #1e293b;
            font-size: 12px;
        }
        h1 {
            font-size: 20px;
            margin-bottom: 0;
        }
        .subtitle {
            color: #64748b;
            margin-top: 4px;
            margin-bottom: 24px;
        }
        .score-box {
            border: 1px solid #cbd5e1;
            border-radius: 8px;
            padding: 16px;
            text-align: center;
            margin-bottom: 24px;
        }
        .score {
            font-size: 40px;
            font-weight: bold;
        }
        .score-ok { color: #059669; }
        .score-mid { color: #d97706; }
        .score-low { color: #dc2626; }
        .score-label {
            color: #64748b;
            font-size: 11px;
            text-transform: uppercase;
            letter-spacing: 0.05em;
        }
        .summary {
            margin-top: 12px;
        }
        h2 {
            font-size: 13px;
            text-transform: uppercase;
            letter-spacing: 0.05em;
            color: #64748b;
            border-bottom: 1px solid #e2e8f0;
            padding-bottom: 4px;
            margin-top: 24px;
        }
        .section {
            border: 1px solid #e2e8f0;
            border-radius: 6px;
            padding: 10px 12px;
            margin-top: 8px;
        }
        .section-name {
            font-weight: bold;
        }
        .badge {
            display: inline-block;
            border-radius: 10px;
            padding: 2px 8px;
            font-size: 10px;
            font-weight: bold;
        }
        .badge-critico { background: #fee2e2; color: #b91c1c; }
        .badge-mejorable { background: #fef3c7; color: #b45309; }
        .badge-ok { background: #d1fae5; color: #047857; }
        .keyword {
            display: inline-block;
            background: #f1f5f9;
            border-radius: 10px;
            padding: 3px 10px;
            margin: 3px 4px 0 0;
            font-size: 11px;
        }
        .rewrite {
            border: 1px solid #e2e8f0;
            border-radius: 6px;
            padding: 10px 12px;
            margin-top: 8px;
        }
        .rewrite-original {
            color: #94a3b8;
            text-decoration: line-through;
        }
        .rewrite-improved {
            color: #047857;
            font-weight: bold;
            margin-top: 4px;
        }
        .rewrite-reason {
            color: #94a3b8;
            font-size: 10px;
            margin-top: 4px;
        }
        .footer {
            margin-top: 32px;
            color: #94a3b8;
            font-size: 10px;
            text-align: center;
        }
    </style>
</head>
<body>
    <h1>{{ $isEnglish ? 'CV Analysis Report' : 'Informe de análisis de CV' }}</h1>
    <p class="subtitle">
        {{ $analysis->original_filename }} ·
        {{ $isEnglish ? 'generated on' : 'generado el' }} {{ now()->format('d/m/Y H:i') }}
    </p>

    <div class="score-box">
        <div class="score {{ $result['score'] >= 80 ? 'score-ok' : ($result['score'] >= 50 ? 'score-mid' : 'score-low') }}">
            {{ $result['score'] }}
        </div>
        <div class="score-label">{{ $isEnglish ? 'Score out of 100' : 'Puntuación sobre 100' }}</div>
        <p class="summary">{{ $result['summary'] }}</p>
    </div>

    <h2>{{ $isEnglish ? 'Feedback by section' : 'Feedback por sección' }}</h2>
    @foreach ($result['sections'] as $section)
        <div class="section">
            <span class="section-name">{{ $section['name'] }}</span>
            <span class="badge badge-{{ $section['severity'] }}">
                {{ $isEnglish
                    ? ['critico' => 'Critical', 'mejorable' => 'Needs work', 'ok' => 'Good'][$section['severity']]
                    : ['critico' => 'Crítico', 'mejorable' => 'Mejorable', 'ok' => 'Correcto'][$section['severity']] }}
            </span>
            <p>{{ $section['feedback'] }}</p>
        </div>
    @endforeach

    @if (!empty($result['missing_keywords']))
        <h2>{{ $isEnglish ? 'Missing keywords' : 'Palabras clave ausentes' }}</h2>
        <p>
            @foreach ($result['missing_keywords'] as $keyword)
                <span class="keyword">{{ $keyword }}</span>
            @endforeach
        </p>
    @endif

    @if (!empty($result['bullet_rewrites']))
        <h2>{{ $isEnglish ? 'Rewritten bullet points' : 'Puntos reescritos' }}</h2>
        @foreach ($result['bullet_rewrites'] as $rewrite)
            <div class="rewrite">
                <p class="rewrite-original">{{ $rewrite['original'] }}</p>
                <p class="rewrite-improved">{{ $rewrite['improved'] }}</p>
                <p class="rewrite-reason">{{ $rewrite['reason'] }}</p>
            </div>
        @endforeach
    @endif

    <p class="footer">
        {{ $isEnglish
            ? 'Generated by CV Optimizer AI · AI-generated analysis, always review the result with your own judgment.'
            : 'Generado por CV Optimizer AI · análisis realizado por IA, revisa siempre el resultado con criterio propio.' }}
    </p>
</body>
</html>
