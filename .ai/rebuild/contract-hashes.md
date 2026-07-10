# Frontend contract hashes

SHA-256 snapshot cho các file quyết định stack, route, API và domain contract tại `FE-RB-002`. Hash phản ánh **working tree ngày 2026-07-10**, không chỉ HEAD.

| SHA-256 | File |
| --- | --- |
| `aa04e384f9a374929d476d6718fd422b81b9b133ed147fba123d5f24dc9d479e` | `frontend/package.json` |
| `1e9e5d77ac0471563dd9722085e99a00504634071cb316cafd798251262bfa04` | `frontend/package-lock.json` |
| `d7da3f1fa0917c5f2a05c981a0a753ca5cce72146eae6e83b36bd7232bec1f09` | `frontend/tsconfig.app.json` |
| `1aeb4db8ffe65cc83aee108460dd00b87c6f27f135c1af76856042a2e31ad392` | `frontend/vite.config.ts` |
| `d481fa50773ad6a3c3934d8a9168f42aed6252b097b012b921c554bf0c9a3bb1` | `frontend/tailwind.config.ts` |
| `be0ec134a0ff0d9990fbba7ebe8894f31e711929af819afdf8a77634b0f05577` | `frontend/src/app/router.tsx` |
| `0439a4ee07cf5404945251e4cd20022a540e091304d839fd364424279df2e920` | `frontend/src/services/api.ts` |
| `505ad38746b2eb1e21506a56f2076e04fd7c17cb50185408b76422681a03df1b` | `frontend/src/services/errors.ts` |
| `a28da6af2fa87763c5c9f73abe477ae59190851778c8e321c199a07f67ba5dd2` | `frontend/src/types/api.ts` |
| `7798f77e70c93d030d121432126f19b9adc4fda7770740defb52556553f17629` | `frontend/src/types/domain.ts` |
| `5b125ccd475aa604fc4ab23108cbde865c7321fd2a5f28c4a876b359ffc68bff` | `frontend/src/features/account/api.ts` |
| `7d03053e5c1846c1201e65d4f494c39bd2fffc3c7023369846367922f725e294` | `frontend/src/features/account/types.ts` |
| `6d4d79fa1fee31b902690799d05ed6ef868235deceaa1e2fbc8bfe544944069e` | `frontend/src/features/admin/api.ts` |
| `3df184e1e0fb9a7d35506926c06b380cee5f2885607dd804a0b7d7fe666e4ae6` | `frontend/src/features/admin/types.ts` |
| `a37ed4e352ba5174822f32e106e81840bf6f9078dff2ef59fe9bf4a70f551e54` | `frontend/src/features/auth/api.ts` |
| `e250b492c3f29c7d8b85eccb9a3ff5e7d01d26cba0a2ac02cf663ddfb421fded` | `frontend/src/features/cart/api.ts` |
| `d5e0a0e5a89b22e25a49ca4aa24cd6f9a69654a6b9ef880fb8ac35f43e4109d4` | `frontend/src/features/cart/types.ts` |
| `75365bc132c8952c9df7fe40697ef9c88c17b89bf9f44eec6383999bdd1c8e28` | `frontend/src/features/catalog/api.ts` |
| `e41f9fc3e36a80797062d07de60918b274b2ebce70e1553487c2f5b016f7ce23` | `frontend/src/features/catalog/types.ts` |
| `4702b4832757c8e1ab92c21573018113d32ee8d1defa737be28f6299183f3a15` | `frontend/src/features/checkout/api.ts` |
| `0f80c7b2eeedb9ccdf15a773e64b466b7b6c360ff48e47b6398727e3968bda9f` | `frontend/src/features/checkout/types.ts` |
| `3ec302e07aa42daebd13c99bfb047752de0df1b796d42eb011f6a61cb17ba6ce` | `frontend/src/features/orders/api.ts` |
| `4f3bb028702d4ee7b0c4f64eab28680d975065f0800bd4ada8be88b4b538b60b` | `frontend/src/features/orders/types.ts` |
| `adb08ce62af5339101a65c0710f789f8ab74366046ef7c31c1cd402d8b3765e6` | `frontend/src/features/reviews/api.ts` |
| `34c2001ceba6751b9805cc75043bbef8b4db28afcaa7997e5e1c4d25c3407907` | `frontend/src/features/seller/api.ts` |
| `a302fd54dfe1cabc579373b42dd383a7b6bd61919c7edd48c0ce792c01a6013c` | `frontend/src/features/seller/types.ts` |

## Cách dùng

- Hash thay đổi không đồng nghĩa regression; nó yêu cầu review contract diff trước khi tiếp tục route migration.
- Không dùng hash để bỏ qua semantic review của API/type/permission.
- Khi một contract change được phê duyệt, cập nhật manifest, hash và task/acceptance bị ảnh hưởng trong cùng PR.
