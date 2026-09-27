<?php

namespace App\Imports;

use Maatwebsite\Excel\Concerns\ToArray;
use Maatwebsite\Excel\Concerns\WithHeadingRow;

class StudentImport implements ToArray, WithHeadingRow
{
    public function array(array $array): void
    {
        // Rows are handled by the controller.
    }
}