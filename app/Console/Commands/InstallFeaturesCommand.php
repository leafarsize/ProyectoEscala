<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Laravel\Chisel\Chisel;
use Laravel\Chisel\Question;
use Laravel\Chisel\Script;

use function Laravel\Prompts\multiselect;
use function Laravel\Prompts\spin;

class InstallFeaturesCommand extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'install:features
        {--answers= : JSON string of answers to skip interactive prompts}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Choose which starter kit features to keep';

    public function handle(): int
    {
        if ($this->shouldDeferInstallerHooks()) {
            return self::SUCCESS;
        }

        if (! file_exists(base_path('chisel.php'))) {
            return self::SUCCESS;
        }

        /** @var Script $script */
        $script = require base_path('chisel.php');

        // API de laravel/chisel 0.1: ask(...)->withAnswers() reúne las respuestas y run() las aplica
        $answers = $script
            ->ask(fn (Question $question) => multiselect(
                label: $question->label,
                options: $question->options,
                default: $question->default ?? [],
                required: $question->required,
                hint: $question->hint,
            ))
            ->interactive($this->input->isInteractive())
            ->withAnswers($this->providedAnswers());

        $skipNode = $this->shouldSkipNode();

        if (! $skipNode) {
            $this->installNodeDependencies();
        }

        $script->run($answers);

        if (! $skipNode) {
            $this->buildAssets();
        }

        return self::SUCCESS;
    }

    /**
     * Respuestas pasadas con --answers='{"pregunta": [...]}'.
     *
     * @return array<string, mixed>
     */
    protected function providedAnswers(): array
    {
        $json = $this->option('answers');

        if (! is_string($json)) {
            return [];
        }

        $answers = json_decode($json, true, 512, JSON_THROW_ON_ERROR);

        return is_array($answers) ? $answers : [];
    }

    protected function shouldDeferInstallerHooks(): bool
    {
        if ($this->option('answers') !== null) {
            return false;
        }

        return $this->installerFlag('LARAVEL_INSTALLER_DEFER_HOOKS');
    }

    protected function shouldSkipNode(): bool
    {
        return $this->installerFlag('LARAVEL_INSTALLER_NO_NODE');
    }

    protected function installerFlag(string $name): bool
    {
        return filter_var(
            $_ENV[$name] ?? $_SERVER[$name] ?? getenv($name),
            FILTER_VALIDATE_BOOL,
        );
    }

    protected function installNodeDependencies(): void
    {
        $npm = Chisel::in(base_path())->npm();
        $packageManager = $npm->packageManager();

        spin(
            fn () => $npm->install(),
            "Installing dependencies with {$packageManager->value}...",
        );
    }

    protected function buildAssets(): void
    {
        $npm = Chisel::in(base_path())->npm();

        spin(
            fn () => $npm->run('build'),
            'Building assets...',
        );
    }
}
