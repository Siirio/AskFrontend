import { useState, useCallback } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { useStore } from '@/core/store';
import { useNavigation } from '@/shared/lib/navigation';
import { showToast } from '@/shared/ui/Toast';
import { ImportStepper } from '@/features/product-import/ui/ImportStepper';
import { ImportUploadStep } from '@/features/product-import/ui/ImportUploadStep';
import { MappingStep } from '@/features/product-import/ui/MappingStep';
import { PreviewStep } from '@/features/product-import/ui/PreviewStep';
import {
  DEMO_COLUMNS,
  DEMO_SAMPLE_ROWS,
  getDefaultMappings,
} from '@/features/product-import/model/defaults';
import { mockParseExcel, mockSaveMapping, mockApproveImport } from '@/features/product-import/api/mock-api';
import type { ImportMapping } from '@/features/product-import/model/types';

type Props = {
  branchId: string;
  branchName: string;
};

export const ProductImportPage = ({ branchId, branchName }: Props) => {
  const { goBack } = useNavigation();
  const {
    importSession,
    setStep,
    setImportSession,
    setMappings,
    updateMapping,
    setPreviewRows,
    setImportedCount,
    resetImport,
    addProducts,
  } = useStore();

  const [loadingState, setLoadingState] = useState(false);

  const setupImportSession = useCallback(
    (columns: string[], rows: Record<string, string>[]) => {
      const result: { columns: string[]; sampleRows: Record<string, string>[]; rawRows: Record<string, string>[] } = {
        columns,
        sampleRows: rows.slice(0, 3),
        rawRows: rows,
      };
      const defaultMappings = getDefaultMappings(result.columns);

      setImportSession({
        branchId,
        branchName,
        rawColumns: result.columns,
        sampleRows: result.sampleRows,
        rawRows: result.rawRows,
      });
      setMappings(defaultMappings);
      setStep('mapping');
    },
    [branchId, branchName],
  );

  const handleFilePicked = useCallback(
    (columns: string[], rows: Record<string, string>[]) => {
      setupImportSession(columns, rows);
    },
    [setupImportSession],
  );

  const handleUseDemo = useCallback(async () => {
    setLoadingState(true);
    try {
      await mockParseExcel(DEMO_COLUMNS, DEMO_SAMPLE_ROWS, DEMO_SAMPLE_ROWS);
      setupImportSession(DEMO_COLUMNS, DEMO_SAMPLE_ROWS);
    } finally {
      setLoadingState(false);
    }
  }, [setupImportSession]);

  const handleUpdateMapping = useCallback(
    (index: number, mapping: ImportMapping) => {
      updateMapping(index, mapping);
    },
    [],
  );

  const handleContinueToPreview = useCallback(async () => {
    setLoadingState(true);
    try {
      const result = await mockSaveMapping(
        importSession.rawRows,
        importSession.mappings,
        branchId,
      );
      setPreviewRows(result.previewRows);
      setStep('preview');
    } finally {
      setLoadingState(false);
    }
  }, [importSession.rawRows, importSession.mappings, branchId]);

  const handleApprove = useCallback(async () => {
    setLoadingState(true);
    try {
      const result = await mockApproveImport(
        importSession.previewRows,
        importSession.mappings,
        branchId,
      );
      addProducts(result.products);
      setImportedCount(result.count);
      showToast(
        `Импортировано ${result.count} товаров в текущий филиал`,
        'success',
      );
      resetImport();
      goBack();
    } finally {
      setLoadingState(false);
    }
  }, [importSession.previewRows, importSession.mappings, branchId]);

  const handleBackToUpload = useCallback(() => {
    setStep('upload');
  }, []);

  const handleBackToMapping = useCallback(() => {
    setStep('mapping');
  }, []);

  const handleClose = useCallback(() => {
    resetImport();
    goBack();
  }, []);

  return (
    <View className="flex-1 bg-white">
      <View className="flex-row items-center px-4 pt-3 pb-2 border-b border-gray-200">
        <TouchableOpacity onPress={handleClose}>
          <Text className="text-sm text-teal-600 font-medium">
            {'\u2190'} Назад к товарам
          </Text>
        </TouchableOpacity>
        <View className="flex-1" />
        <Text className="text-sm text-gray-400">{branchName}</Text>
      </View>

      <ImportStepper currentStep={importSession.step} />

      {importSession.step === 'upload' ? (
        <ImportUploadStep
          branchName={branchName}
          isLoading={loadingState}
          onUseDemoDataset={handleUseDemo}
          onFilePicked={handleFilePicked}
        />
      ) : null}

      {importSession.step === 'mapping' ? (
        <MappingStep
          columns={importSession.rawColumns}
          sampleRows={importSession.sampleRows}
          mappings={importSession.mappings}
          isLoading={loadingState}
          onUpdateMapping={handleUpdateMapping}
          onBack={handleBackToUpload}
          onContinue={handleContinueToPreview}
        />
      ) : null}

      {importSession.step === 'preview' ? (
        <PreviewStep
          previewRows={importSession.previewRows}
          ignoredColumns={importSession.mappings
            .filter((m) => m.targetField === 'IGNORE')
            .map((m) => m.sourceColumn)}
          appendToDescColumns={importSession.mappings
            .filter((m) => m.targetField === 'APPEND_TO_DESCRIPTION')
            .map((m) => m.sourceColumn)}
          characteristicColumns={importSession.mappings
            .filter((m) => m.targetField === 'CHARACTERISTIC')
            .map((m) => ({
              source: m.sourceColumn,
              name: m.characteristicName || m.sourceColumn,
            }))}
          validCount={importSession.previewRows.filter((r) => r.status !== 'INVALID').length}
          invalidCount={importSession.previewRows.filter((r) => r.status === 'INVALID').length}
          warningCount={importSession.previewRows.filter((r) => r.status === 'WARNING').length}
          isLoading={loadingState}
          onBack={handleBackToMapping}
          onApprove={handleApprove}
        />
      ) : null}
    </View>
  );
};
