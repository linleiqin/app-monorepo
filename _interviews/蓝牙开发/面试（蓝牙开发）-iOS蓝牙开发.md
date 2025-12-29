# 蓝牙开发面试准备 - iOS 蓝牙开发（Core Bluetooth）

### 问题 11：请解释 iOS 中的 Core Bluetooth 框架，包括 CBCentralManager 和 CBPeripheralManager

**答案：**

Core Bluetooth 是 iOS 中用于 BLE 开发的框架，提供了完整的 BLE 功能接口，包括设备扫描、连接、数据传输等。

Core Bluetooth 的架构：Core Bluetooth 采用中央-外设（Central-Peripheral）架构。中央设备（如 iPhone）扫描和连接外设设备（如智能手环），外设设备提供服务和数据。iOS 设备通常作为中央设备，但也可以作为外设设备。

CBCentralManager：CBCentralManager 是中央设备管理器，用于扫描、连接和管理外设设备。CBCentralManager 负责管理蓝牙状态、扫描设备、连接设备等操作。使用 CBCentralManager 需要设置代理（Delegate），通过代理方法接收蓝牙状态变化、扫描结果、连接事件等回调。

CBPeripheralManager：CBPeripheralManager 是外设设备管理器，用于将 iOS 设备配置为外设，提供服务和数据。CBPeripheralManager 负责管理外设状态、发布服务、处理中央设备的读写请求等。使用 CBPeripheralManager 可以创建自定义的 BLE 服务，让其他设备连接和访问。

两者的区别：CBCentralManager 用于作为客户端连接其他设备，CBPeripheralManager 用于作为服务器被其他设备连接。大多数应用使用 CBCentralManager 连接外部设备，少数应用（如 Beacon）使用 CBPeripheralManager。

代理模式：Core Bluetooth 使用代理模式处理异步事件。CBCentralManagerDelegate 处理中央设备相关事件，CBPeripheralDelegate 处理外设设备相关事件，CBPeripheralManagerDelegate 处理外设管理器相关事件。所有蓝牙操作都是异步的，通过代理方法返回结果。

在实际开发中，开发者主要使用 CBCentralManager 连接外部设备。需要创建 CBCentralManager 实例，设置代理，检查蓝牙状态，然后扫描和连接设备。理解中央-外设架构有助于正确使用 Core Bluetooth。

**简洁回答：**

Core Bluetooth 是 iOS 的 BLE 开发框架，采用中央-外设架构。CBCentralManager 是中央设备管理器，用于扫描和连接外设；CBPeripheralManager 是外设设备管理器，用于提供服务和数据。使用代理模式处理异步事件。大多数应用使用 CBCentralManager 连接外部设备。

**关键字解释：**

- **Core Bluetooth**：iOS 中用于 BLE 开发的框架。

- **CBCentralManager**：中央设备管理器，用于扫描和连接外设设备。

- **CBPeripheralManager**：外设设备管理器，用于将 iOS 设备配置为外设。

- **中央-外设架构（Central-Peripheral）**：BLE 的通信架构，中央设备连接外设设备。

- **代理模式（Delegate Pattern）**：Core Bluetooth 使用的异步事件处理模式。

---

### 问题 12：什么是 CBCentralManager？如何使用它进行蓝牙设备扫描和连接？

**答案：**

CBCentralManager 是 Core Bluetooth 中用于管理中央设备的类，负责扫描、连接和管理外设设备。

CBCentralManager 的初始化：创建 CBCentralManager 实例时，需要传入代理对象和队列。可以使用主队列或自定义队列，主队列会在主线程调用代理方法，自定义队列会在后台线程调用。初始化后，系统会检查蓝牙状态，通过代理方法返回状态。

蓝牙状态检查：CBCentralManager 的状态包括：unknown（未知）、resetting（重置中）、unsupported（不支持）、unauthorized（未授权）、poweredOff（关闭）、poweredOn（开启）。只有当状态为 poweredOn 时，才能进行扫描和连接操作。

扫描设备：使用 `scanForPeripherals(withServices:options:)` 方法扫描设备。可以指定服务 UUID 数组来过滤扫描结果，只发现包含指定服务的设备。也可以传入 nil 扫描所有设备。扫描选项可以设置是否允许重复发现同一设备。扫描结果通过 `centralManager(_:didDiscover:advertisementData:rssi:)` 代理方法返回。

连接设备：使用 `connect(_:options:)` 方法连接设备。连接选项可以设置连接参数，如是否在后台保持连接等。连接成功或失败通过 `centralManager(_:didConnect:)` 和 `centralManager(_:didFailToConnect:error:)` 代理方法返回。

断开连接：使用 `cancelPeripheralConnection(_:)` 方法断开连接。断开连接后通过 `centralManager(_:didDisconnectPeripheral:error:)` 代理方法通知。

扫描和连接的流程：首先检查蓝牙状态，状态为 poweredOn 后开始扫描。扫描到目标设备后，保存设备引用，停止扫描，然后连接设备。连接成功后，可以开始发现服务和特征值。

在实际开发中，应该先检查蓝牙状态，确保蓝牙已开启。扫描时应该设置合理的超时时间，避免无限扫描。连接后应该保存设备引用，避免设备被释放。应该处理连接失败和断开的情况，实现重连机制。

**简洁回答：**

CBCentralManager 是中央设备管理器，用于扫描和连接外设。使用步骤：1. 创建实例并设置代理；2. 检查蓝牙状态（poweredOn）；3. 调用 scanForPeripherals 扫描设备；4. 在代理方法中获取扫描结果；5. 调用 connect 连接设备；6. 在代理方法中处理连接结果。应该处理状态检查、扫描超时、连接失败等情况。

**关键字解释：**

- **CBCentralManager**：中央设备管理器，用于扫描和连接外设。

- **scanForPeripherals**：扫描 BLE 设备的方法。

- **connect**：连接外设设备的方法。

- **蓝牙状态（Bluetooth State）**：CBCentralManager 的当前状态，需要 poweredOn 才能操作。

- **代理方法（Delegate Methods）**：处理扫描和连接事件的回调方法。

---

### 问题 13：请说明 CBPeripheral 的使用，包括发现服务和特征值的过程

**答案：**

CBPeripheral 代表一个外设设备，连接后通过 CBPeripheral 进行服务发现、特征值读写等操作。

CBPeripheral 的获取：扫描设备时，在 `didDiscover` 代理方法中获取 CBPeripheral 对象。连接成功后，在 `didConnect` 代理方法中也会返回 CBPeripheral 对象。需要保存 CBPeripheral 的引用，避免被释放。

设置代理：连接后需要设置 CBPeripheral 的代理，通过代理方法接收服务发现、特征值发现、读写结果等事件。代理对象需要实现 CBPeripheralDelegate 协议。

发现服务：连接成功后，调用 `discoverServices(_:)` 方法发现服务。可以传入服务 UUID 数组来过滤，只发现指定的服务；也可以传入 nil 发现所有服务。服务发现完成后，通过 `peripheral(_:didDiscoverServices:)` 代理方法返回服务列表。

发现特征值：发现服务后，对每个服务调用 `discoverCharacteristics(_:for:)` 方法发现特征值。可以传入特征值 UUID 数组来过滤，也可以传入 nil 发现所有特征值。特征值发现完成后，通过 `peripheral(_:didDiscoverCharacteristicsFor:error:)` 代理方法返回特征值列表。

服务发现流程：连接成功后，首先调用 discoverServices 发现服务。在 didDiscoverServices 中遍历服务，对每个服务调用 discoverCharacteristics 发现特征值。在 didDiscoverCharacteristics 中获取特征值列表，然后可以根据特征值的属性进行读写操作。

CBPeripheral 的属性：CBPeripheral 有多个属性，包括 name（设备名称）、identifier（设备标识符）、state（连接状态）等。state 包括 disconnected（未连接）、connecting（连接中）、connected（已连接）、disconnecting（断开中）等。

在实际开发中，应该按照正确的顺序进行服务发现：先发现服务，再发现特征值。应该保存服务和特征值的引用，避免重复发现。应该处理发现失败的情况，实现错误处理和重试机制。发现完成后，可以根据特征值的属性进行相应的操作。

**简洁回答：**

CBPeripheral 代表外设设备，连接后通过它进行服务发现和特征值发现。流程：1. 连接后设置代理；2. 调用 discoverServices 发现服务；3. 在 didDiscoverServices 中遍历服务；4. 对每个服务调用 discoverCharacteristics 发现特征值；5. 在 didDiscoverCharacteristics 中获取特征值列表。应该按顺序进行，保存引用，处理错误。

**关键字解释：**

- **CBPeripheral**：代表外设设备的类。

- **discoverServices**：发现服务的方法。

- **discoverCharacteristics**：发现特征值的方法。

- **CBPeripheralDelegate**：CBPeripheral 的代理协议。

- **服务发现（Service Discovery）**：发现外设提供的服务的过程。

---

### 问题 14：什么是 CBCharacteristic？如何读写特征值？

**答案：**

CBCharacteristic 代表一个特征值，是实际的数据单元，可以进行读写操作或订阅通知。

CBCharacteristic 的属性：CBCharacteristic 有多个属性，包括 uuid（特征值 UUID）、value（特征值数据）、properties（属性）等。properties 定义了特征值的操作类型，包括 read（可读）、write（可写）、notify（可通知）、indicate（可指示）等。

读取特征值：如果特征值的 properties 包含 read，可以调用 `readValue(for:)` 方法读取特征值。读取是异步操作，结果通过 `peripheral(_:didUpdateValueFor:error:)` 代理方法返回。读取的数据在 characteristic.value 中，是 Data 类型。

写入特征值：如果特征值的 properties 包含 write 或 writeWithoutResponse，可以调用 `writeValue(_:for:type:)` 方法写入特征值。type 参数指定写入类型：withResponse 需要响应确认，withoutResponse 不需要响应（更快但不可靠）。写入结果通过 `peripheral(_:didWriteValueFor:error:)` 代理方法返回（仅 for withResponse 类型）。

订阅通知：如果特征值的 properties 包含 notify 或 indicate，可以订阅通知。调用 `setNotifyValue(_:for:)` 启用通知，当特征值变化时，外设会自动推送数据，通过 `peripheral(_:didUpdateValueFor:error:)` 代理方法接收。notify 不需要确认，indicate 需要确认。

特征值的值：特征值的 value 是 Data 类型，需要根据协议转换为相应的数据类型。例如，如果特征值存储的是整数，需要将 Data 转换为 Int；如果存储的是字符串，需要转换为 String。转换时需要注意字节序（大端或小端）。

在实际开发中，应该先检查特征值的 properties，确保支持相应的操作。读取和写入的数据需要按照协议格式进行编码和解码。订阅通知后，应该处理数据更新。应该处理读写失败的情况，实现错误处理和重试机制。

**简洁回答：**

CBCharacteristic 代表特征值，是实际的数据单元。读取：调用 readValue，在 didUpdateValueFor 中获取数据。写入：调用 writeValue，type 为 withResponse 或 withoutResponse，在 didWriteValueFor 中确认。订阅：调用 setNotifyValue 启用通知，在 didUpdateValueFor 中接收更新。需要检查 properties 确保支持操作，数据需要编码解码。

**关键字解释：**

- **CBCharacteristic**：代表特征值的类。

- **readValue**：读取特征值的方法。

- **writeValue**：写入特征值的方法。

- **setNotifyValue**：订阅通知的方法。

- **properties**：特征值的属性，定义支持的操作类型。

- **withResponse/withoutResponse**：写入类型，withResponse 需要确认，withoutResponse 不需要。

---

### 问题 15：请解释 iOS 蓝牙开发中的委托模式（Delegate Pattern）和回调机制

**答案：**

委托模式是 Core Bluetooth 中处理异步事件的核心机制，通过代理对象接收蓝牙操作的结果和状态变化。

委托模式的工作原理：Core Bluetooth 中的类（如 CBCentralManager、CBPeripheral）都有代理属性，开发者设置代理对象后，当事件发生时，系统会调用代理对象的相应方法。代理对象需要实现对应的代理协议（如 CBCentralManagerDelegate、CBPeripheralDelegate）。

CBCentralManagerDelegate：处理中央设备相关事件，包括蓝牙状态变化、设备扫描结果、连接结果等。主要方法包括：`centralManagerDidUpdateState`（状态更新）、`centralManager(_:didDiscover:advertisementData:rssi:)`（发现设备）、`centralManager(_:didConnect:)`（连接成功）、`centralManager(_:didFailToConnect:error:)`（连接失败）、`centralManager(_:didDisconnectPeripheral:error:)`（断开连接）等。

CBPeripheralDelegate：处理外设设备相关事件，包括服务发现、特征值发现、读写结果等。主要方法包括：`peripheral(_:didDiscoverServices:)`（发现服务）、`peripheral(_:didDiscoverCharacteristicsFor:error:)`（发现特征值）、`peripheral(_:didUpdateValueFor:error:)`（读取或通知更新）、`peripheral(_:didWriteValueFor:error:)`（写入完成）等。

回调的执行：所有代理方法都在指定的队列中执行。如果创建 CBCentralManager 时使用主队列，代理方法在主线程执行；如果使用自定义队列，代理方法在后台线程执行。如果需要在代理方法中更新 UI，需要切换到主线程。

委托模式的优势：委托模式解耦了蓝牙操作和结果处理，使代码结构更清晰。异步操作不会阻塞主线程，提高了应用的响应性。通过代理方法可以集中处理所有蓝牙事件，便于管理和调试。

在实际开发中，应该正确设置代理，确保代理对象不会被释放。代理方法中应该处理所有可能的情况，包括成功、失败、错误等。如果代理方法在后台线程执行，更新 UI 时需要切换到主线程。可以使用 weak 引用避免循环引用。

**简洁回答：**

委托模式是 Core Bluetooth 处理异步事件的核心机制。设置代理对象后，系统通过代理方法返回操作结果。CBCentralManagerDelegate 处理扫描和连接事件，CBPeripheralDelegate 处理服务发现和读写事件。代理方法在指定队列执行，更新 UI 需要切换到主线程。委托模式解耦操作和结果处理，提高代码清晰度。

**关键字解释：**

- **委托模式（Delegate Pattern）**：通过代理对象处理异步事件的模式。

- **CBCentralManagerDelegate**：中央设备管理器的代理协议。

- **CBPeripheralDelegate**：外设设备的代理协议。

- **代理方法（Delegate Methods）**：处理事件的回调方法。

- **异步操作（Asynchronous Operations）**：不会阻塞线程的操作。

---

### 问题 16：什么是蓝牙的后台模式（Background Mode）？如何在后台使用蓝牙？

**答案：**

后台模式允许应用在后台继续使用蓝牙功能，即使应用不在前台也能扫描、连接和传输数据。

后台模式的配置：需要在 Info.plist 中添加 UIBackgroundModes 数组，包含 bluetooth-central 或 bluetooth-peripheral。bluetooth-central 用于作为中央设备在后台扫描和连接，bluetooth-peripheral 用于作为外设设备在后台提供服务。

后台扫描的限制：iOS 对后台扫描有严格限制。应用在后台时，只能扫描之前连接过的设备（通过 identifier 恢复连接），不能扫描新设备。如果需要扫描新设备，应用必须在前台。

后台连接：应用在后台时可以连接到已知的设备（之前连接过的设备）。连接时需要使用设备的 identifier，通过 `retrievePeripherals(withIdentifiers:)` 或 `retrieveConnectedPeripherals(withServices:)` 方法获取之前连接过的设备。

后台数据传输：连接后，应用在后台可以继续读写特征值和接收通知。但系统可能会暂停应用，导致延迟。为了保持连接，应该定期进行数据传输，或者使用后台任务（Background Task）延长执行时间。

状态恢复：应用从后台恢复时，CBCentralManager 会恢复之前的状态。如果设置了状态恢复标识符（restorationIdentifier），系统会调用 `centralManager(_:willRestoreState:)` 方法，可以恢复之前的连接和设备引用。

最佳实践：应该只在必要时启用后台模式，因为会增加电池消耗。应该使用设备的 identifier 恢复连接，而不是重新扫描。应该处理应用被系统终止的情况，实现状态恢复。应该定期进行数据传输，保持连接活跃。

在实际开发中，应该根据应用需求决定是否启用后台模式。如果只需要在前台使用蓝牙，不需要配置后台模式。如果需要后台功能，应该正确配置 Info.plist，实现状态恢复，处理后台限制。

**简洁回答：**

后台模式允许应用在后台使用蓝牙。配置：在 Info.plist 中添加 UIBackgroundModes，包含 bluetooth-central 或 bluetooth-peripheral。限制：后台只能扫描之前连接过的设备，不能扫描新设备。使用设备的 identifier 恢复连接。连接后可以继续数据传输，但系统可能暂停应用。应该实现状态恢复，处理后台限制。

**关键字解释：**

- **后台模式（Background Mode）**：允许应用在后台使用特定功能的模式。

- **bluetooth-central**：后台模式类型，用于中央设备。

- **bluetooth-peripheral**：后台模式类型，用于外设设备。

- **状态恢复（State Restoration）**：应用恢复时恢复之前的状态。

- **identifier**：设备的唯一标识符，用于恢复连接。

---

### 问题 17：请说明 iOS 蓝牙开发中的权限管理，包括 Info.plist 配置

**答案：**

iOS 蓝牙开发需要配置权限和隐私说明，确保用户可以理解应用为什么需要蓝牙权限。

Info.plist 配置：iOS 13 后，使用蓝牙需要在 Info.plist 中添加隐私说明。需要添加 NSBluetoothAlwaysUsageDescription 或 NSBluetoothPeripheralUsageDescription 键，值是对蓝牙使用目的的说明。这个说明会在用户首次使用蓝牙时显示，用户需要授权才能使用。

权限请求：首次使用蓝牙功能时，系统会自动弹出权限请求对话框，显示 Info.plist 中配置的说明。用户可以选择允许或拒绝。如果用户拒绝，应用无法使用蓝牙功能。

权限状态检查：可以通过 CBCentralManager 的 state 属性检查权限状态。如果 state 为 unauthorized，表示用户拒绝了权限。此时应该提示用户去设置中开启权限。

权限说明的重要性：权限说明应该清晰说明应用为什么需要蓝牙，帮助用户理解。模糊或不准确的说明可能导致用户拒绝权限，影响应用功能。

iOS 版本差异：iOS 13 之前使用 NSBluetoothPeripheralUsageDescription，iOS 13 后使用 NSBluetoothAlwaysUsageDescription。为了兼容，可以同时添加两个键。

实际配置示例：在 Info.plist 中添加：
```xml
<key>NSBluetoothAlwaysUsageDescription</key>
<string>应用需要蓝牙权限来连接智能设备</string>
<key>NSBluetoothPeripheralUsageDescription</key>
<string>应用需要蓝牙权限来连接智能设备</string>
```

在实际开发中，应该提供清晰的权限说明，说明蓝牙的使用目的。应该检查权限状态，如果被拒绝，提示用户去设置中开启。应该在需要时才请求权限，避免过早请求导致用户困惑。

**简洁回答：**

iOS 蓝牙开发需要在 Info.plist 中添加隐私说明。iOS 13 后使用 NSBluetoothAlwaysUsageDescription，之前使用 NSBluetoothPeripheralUsageDescription。说明应该清晰说明蓝牙使用目的。首次使用时系统自动请求权限，可以通过 state 检查权限状态。如果被拒绝，应该提示用户去设置中开启。

**关键字解释：**

- **NSBluetoothAlwaysUsageDescription**：iOS 13+ 的蓝牙权限说明键。

- **NSBluetoothPeripheralUsageDescription**：iOS 13 之前的蓝牙权限说明键。

- **权限请求（Permission Request）**：系统请求用户授权的过程。

- **权限状态（Permission Status）**：蓝牙权限的当前状态。

---

### 问题 18：什么是蓝牙的状态管理？如何处理蓝牙未开启、未授权等情况？

**答案：**

蓝牙状态管理是处理蓝牙系统各种状态的过程，包括蓝牙开启/关闭、权限授权、设备连接状态等。

蓝牙系统状态：CBCentralManager 的 state 属性表示蓝牙系统状态，包括：unknown（未知，初始化中）、resetting（重置中）、unsupported（设备不支持 BLE）、unauthorized（未授权）、poweredOff（蓝牙关闭）、poweredOn（蓝牙开启）。只有当 state 为 poweredOn 时，才能进行扫描和连接操作。

状态变化的监听：通过 `centralManagerDidUpdateState` 代理方法监听状态变化。当状态改变时（如用户开启或关闭蓝牙），系统会调用这个方法。应该在这个方法中处理状态变化，更新 UI 或采取相应措施。

未开启状态（poweredOff）：如果蓝牙未开启，应该提示用户开启蓝牙。可以显示提示信息，引导用户去设置中开启蓝牙。不应该无限重试，应该等待用户开启后再继续。

未授权状态（unauthorized）：如果用户拒绝了蓝牙权限，应该提示用户去设置中授权。可以显示设置入口，方便用户跳转到设置页面。不应该强制用户授权，应该说明蓝牙的必要性。

不支持状态（unsupported）：如果设备不支持 BLE（如旧设备），应该提示用户设备不支持，或者隐藏蓝牙相关功能。不应该显示错误信息，应该优雅降级。

状态管理的流程：初始化 CBCentralManager 后，首先检查 state。如果 state 不是 poweredOn，等待状态变化。在 centralManagerDidUpdateState 中处理状态变化，当 state 变为 poweredOn 后，开始扫描和连接。应该保存当前状态，避免重复处理。

在实际开发中，应该正确处理所有状态，提供用户友好的提示。应该监听状态变化，及时更新 UI。应该处理状态转换，确保应用在不同状态下都能正常工作。应该避免在非 poweredOn 状态下进行操作。

**简洁回答：**

蓝牙状态管理处理蓝牙系统的各种状态。CBCentralManager 的 state 包括 unknown、resetting、unsupported、unauthorized、poweredOff、poweredOn。只有 poweredOn 才能操作。通过 centralManagerDidUpdateState 监听状态变化。未开启时提示用户开启，未授权时提示授权，不支持时优雅降级。应该正确处理所有状态，提供友好提示。

**关键字解释：**

- **蓝牙状态（Bluetooth State）**：蓝牙系统的当前状态。

- **poweredOn**：蓝牙已开启的状态。

- **poweredOff**：蓝牙已关闭的状态。

- **unauthorized**：未授权的状态。

- **centralManagerDidUpdateState**：状态变化的代理方法。

---

### 问题 19：请解释 iOS 蓝牙开发中的连接超时和重连机制

**答案：**

连接超时和重连机制是确保蓝牙连接稳定性的重要手段，处理连接失败和意外断开的情况。

连接超时：Core Bluetooth 的连接操作没有内置超时机制，如果设备不在范围内或无法连接，连接操作可能一直等待。应该实现自定义超时机制，使用 Timer 或 DispatchSourceTimer 设置超时时间。超时后取消连接，提示用户或重试。

超时实现：连接时启动定时器，设置超时时间（如 10 秒）。如果连接成功，取消定时器；如果超时，取消连接并处理超时情况。可以使用 DispatchSourceTimer 或 Timer 实现。

重连机制：连接断开后，应该实现自动重连机制。重连策略包括：立即重连、延迟重连、指数退避重连等。应该限制重连次数，避免无限重试。应该处理重连失败的情况，提示用户。

重连实现：在 `didDisconnectPeripheral` 代理方法中检测断开原因。如果是意外断开（error 为 nil 或特定错误），启动重连。可以使用 DispatchQueue 延迟执行重连，或者使用定时器实现退避策略。

连接状态管理：应该维护连接状态，包括连接中、已连接、断开中等。避免在连接过程中重复连接，避免在已连接时再次连接。应该保存设备引用，确保重连时使用正确的设备。

错误处理：应该区分不同类型的错误，采取不同的处理策略。网络错误可以重试，权限错误需要用户操作，不支持的错误不应该重试。应该记录错误信息，便于调试。

最佳实践：应该设置合理的超时时间，避免过长或过短。应该限制重连次数，避免无限重试。应该提供用户反馈，让用户知道连接状态。应该处理所有可能的错误情况。

在实际开发中，应该实现连接超时机制，避免无限等待。应该实现重连机制，提高连接稳定性。应该正确处理错误，提供用户友好的提示。应该记录连接日志，便于问题排查。

**简洁回答：**

连接超时和重连机制确保连接稳定性。Core Bluetooth 没有内置超时，需要自定义实现，使用定时器设置超时时间。重连机制在断开后自动重连，可以使用延迟重连或指数退避策略，应该限制重连次数。应该维护连接状态，避免重复连接，正确处理错误，提供用户反馈。

**关键字解释：**

- **连接超时（Connection Timeout）**：连接操作的最大等待时间。

- **重连机制（Reconnection Mechanism）**：连接断开后自动重新连接的机制。

- **指数退避（Exponential Backoff）**：重连间隔逐渐增加的策略。

- **连接状态（Connection State）**：连接的当前状态。

---

### 问题 20：什么是蓝牙的 MTU 协商？如何在 iOS 中实现 MTU 协商？

**答案：**

MTU 协商是客户端和服务器协商最大传输单元大小的过程，BLE 4.2+ 支持将 MTU 从默认的 23 字节协商到最大 251 字节。

MTU 协商的作用：默认 MTU 是 23 字节（实际数据 20 字节），对于大数据传输效率较低。协商更大的 MTU 可以减少分包数量，提高传输效率。BLE 4.2+ 支持数据长度扩展，可以协商到 251 字节（实际数据 247 字节）。

MTU 协商的时机：MTU 协商通常在连接建立后、服务发现之前进行。这样可以确保后续的数据传输使用更大的 MTU。也可以在连接后的任何时候进行，但应该在数据传输前完成。

iOS 中的实现：使用 `maximumWriteValueLength(for:)` 方法获取当前 MTU 大小。这个方法返回当前可以写入的最大数据长度。连接后，系统会自动协商 MTU，但可以通过 `peripheral(_:didModifyServices:)` 代理方法监听 MTU 变化。

MTU 协商的限制：MTU 的大小取决于双方设备支持的最大值，取两者中的较小值。iOS 设备通常支持 185 字节或 251 字节，取决于设备和 iOS 版本。实际 MTU 可能小于请求的值。

检查 MTU 大小：连接后可以调用 `maximumWriteValueLength(for:)` 检查当前 MTU。这个方法返回实际可以写入的最大长度，不包括协议头。应该根据这个值决定数据分包大小。

MTU 的使用：写入数据时，如果数据超过 MTU，需要分包传输。应该检查 `maximumWriteValueLength`，确保每次写入的数据不超过这个值。对于大数据传输，应该实现分包逻辑。

在实际开发中，应该在连接后检查 MTU 大小，了解实际可用的传输能力。应该根据 MTU 大小实现数据分包，确保数据传输正确。应该注意不同设备和版本的 MTU 限制，实现兼容性处理。

**简洁回答：**

MTU 协商是客户端和服务器协商最大传输单元的过程，BLE 4.2+ 可协商到 251 字节。iOS 中连接后系统自动协商，可以通过 maximumWriteValueLength 检查当前 MTU。写入数据时应该检查 MTU，超过时需要分包。应该在连接后检查 MTU，根据实际值实现数据分包。

**关键字解释：**

- **MTU 协商（MTU Negotiation）**：协商最大传输单元大小的过程。

- **maximumWriteValueLength**：获取当前 MTU 大小的方法。

- **数据长度扩展（Data Length Extension）**：BLE 4.2 引入的特性。

- **数据分包（Data Fragmentation）**：将大数据分成多个包传输。

---
