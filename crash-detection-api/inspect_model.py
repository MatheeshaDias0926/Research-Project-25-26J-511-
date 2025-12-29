import h5py
import sys

def inspect_h5_structure(filepath, group='/', indent=0):
    """Recursively print H5 file structure"""
    with h5py.File(filepath, 'r') as f:
        def print_structure(name, obj):
            print('  ' * indent + f'{name}: {type(obj).__name__}')
            if isinstance(obj, h5py.Dataset):
                print('  ' * (indent + 1) + f'Shape: {obj.shape}, Dtype: {obj.dtype}')

        if group == '/':
            print(f"\nH5 File Structure for: {filepath}")
            print("="* 60)
            f.visititems(print_structure)
        else:
            f[group].visititems(print_structure)

if __name__ == "__main__":
    model_path = "crash_detection_model.h5"
    inspect_h5_structure(model_path)
