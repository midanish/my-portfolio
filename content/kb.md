---
version: public_v1
note: Every leaf section below is written from public sources only (the published resume, this portfolio site, and public GitHub repositories). Each leaf names its source. Nothing here comes from confidential NXP files or internal source code.
---

# Profile {#profile}

## Summary {#profile.summary}
<!-- source: resume; public/data/portfolio.json -->
Muhammad Iqmal Danish bin Hasnan is an engineer with 3 years of experience that combines AI and computer-vision development, production machine vision, and semiconductor manufacturing. He works in Python, C/C++, C#, PyTorch, TensorFlow, OpenCV, HALCON, YOLOv8, MobileNetV2 and RAG/LLM systems, and has deployed real-time vision and automation systems in production. He is looking for an AI Engineer role where industrial domain knowledge, software engineering and applied AI come together in production-scale systems. He is based in Cheras, Selangor, Malaysia.

## Contact {#profile.contact}
<!-- source: public/data/portfolio.json -->
Email: midanish2k@gmail.com. LinkedIn: https://www.linkedin.com/in/iqmal-danish. Portfolio: https://my-portfolio-4xu.pages.dev/. GitHub: https://github.com/midanish.

# Skills {#skills}

## Programming and software development {#skills.programming}
<!-- source: resume; public/data/portfolio.json -->
Languages and frameworks: Python, C/C++, C#, JavaScript, Node.js, .NET, WPF, WinForms, MVVM, PowerFX, MATLAB, Assembly language, Arduino IDE, Streamlit, and Git for version control. Desktop applications are typically C#/.NET (WinForms or WPF), with native C++ for performance-critical vision code.

## AI, machine learning and computer vision {#skills.ai_ml}
<!-- source: resume; public/data/portfolio.json -->
Deep learning with PyTorch, TensorFlow and Keras; object detection with YOLOv8; image classification with MobileNetV2 and other CNNs; classical machine vision with OpenCV and HALCON; OCR; data annotation with CVAT and Roboflow; Pandas, predictive modelling, and supervised and unsupervised learning. Generative AI skills: LLM APIs, prompt engineering, retrieval-augmented generation (RAG) and NLP.

## Data, APIs and platforms {#skills.data_platforms}
<!-- source: resume; public/data/portfolio.json -->
Databases: Oracle SQL, MySQL, SQL Server and SQLite. APIs: REST API development and Microsoft Graph API. Platforms: Cloudflare (Pages and Functions), Microsoft Power Platform (Power Apps, Power Automate), SharePoint, Power BI, Google Colab, Jupyter Notebook, IBM Watson, Android Studio, Visual Studio 2022 and Visual Studio Code. Hardware: Raspberry Pi 4. Design tools: AutoCAD, SolidWorks and Adobe Illustrator.

# Work experience {#experience}

## NXP Semiconductors Malaysia — Test Back-End Process Engineer (Dec 2024 to present) {#experience.nxp}

### Process engineering and quality results {#experience.nxp.quality}
<!-- source: public/data/portfolio.json -->
At NXP Semiconductors Malaysia in Petaling Jaya, Iqmal works as a Test Back-End Process Engineer. He consistently achieved more than 99.6% QFN yield across key packages by managing QFN and LGA quality issues with structured problem-solving. He led cross-functional coordination on about 1.4 million units of high-risk metal-lid TPMS lots with full traceability, controlled execution and zero quality escapes. He received a Bronze Technical Excellence Award (TEA) for Q3 2025 and was selected to represent his department at Technical Symposium 2025, with zero safety incidents.

### OCR automation project {#experience.nxp.ocr}
<!-- source: resume -->
Iqmal leads the OCR Automation Project at NXP and contributes to the test back-end Smart Factory integration. He works with IT and equipment vendors to bring vision-driven automation into semiconductor production workflows. Public details are limited to this summary; the project was still in qualification at the time of writing, so no final rollout result is claimed here.

### Vent-hole foreign-material inspection {#experience.nxp.vent_hole}
<!-- source: resume -->
Iqmal applied machine-vision automation to foreign-material detection in the vent holes of an LGA product line. The automated check made it possible to remove a manual pre-bake inspection step completely, saving about 0.4 full-time-equivalent of operator work (about USD 8.8K per year). The detection is classical image processing with measured thresholds, not a trained neural network.

## Greatech Integration — Vision Engineer (Feb 2024 to Nov 2024) {#experience.greatech}

### Production machine-vision systems {#experience.greatech.vision_systems}
<!-- source: resume; public/data/portfolio.json -->
At Greatech Integration in Batu Kawan, Penang, Iqmal designed and developed production machine-vision systems in C# and Python using HALCON and other image-processing libraries, including inspection work for pharmaceutical requirements. These were PC-based inspection applications used on automated production equipment.

### Feasibility studies and commissioning {#experience.greatech.commissioning}
<!-- source: resume; public/data/portfolio.json -->
He ran image evaluation and feasibility studies, selecting vision hardware and software approaches that would hold up under real production constraints. He then deployed and optimised the applications end to end: software architecture, user-interface work, commissioning at factory and customer sites, and ongoing production support in line with ISO standards.

## Aerodyne Group — AI Specialist Apprentice (Aug 2023 to Jan 2024) {#experience.aerodyne}

### YOLOv8 defect detection on electric poles {#experience.aerodyne.detection}
<!-- source: resume; public/data/portfolio.json -->
At Aerodyne Group in Cyberjaya, Iqmal deployed YOLOv8 object-detection models with PyTorch for real-time defect classification on electric poles from inspection images. He improved detection performance through iterative model development, dataset refinement and machine-learning experiments. No public accuracy or mAP figure is available for this work.

### Datasets, annotation and dashboards {#experience.aerodyne.data}
<!-- source: resume; public/data/portfolio.json -->
He curated, annotated and prepared supervised-learning datasets in CVAT and Roboflow for training and evaluating the detection models. He also applied predictive-modelling techniques and built Power BI dashboards to communicate model and operational insights. The apprenticeship was part of the AI and Data Specialist Program run by Aerodyne Group with Yayasan Peneraju.

# Projects {#projects}

## Biometric login system for vision scanners (IQMETRIC, Jun 2026) {#projects.iqmetric}

### What it does {#projects.iqmetric.overview}
<!-- source: resume; public/data/portfolio.json -->
IQMETRIC is a multi-modal biometric login system for production vision scanners, built at NXP. It combines fingerprint and facial recognition so that a person must prove who they are before the scanner's login is unlocked. It was built as an independent, in-house alternative to a vendor solution.

### Face and fingerprint technology {#projects.iqmetric.biometrics}
<!-- source: resume; public/data/portfolio.json -->
The system is written in C++ and C#/.NET. Fingerprint matching uses the DigitalPersona SDK. Face detection and recognition use OpenCV. The C# application handles the user interface and workflow, and native C++ code does the vision and matching work.

### Login control and audit trail {#projects.iqmetric.login_control}
<!-- source: resume; public/data/portfolio.json -->
The application automatically detects the scanner's login window, locks keyboard input, and fills in credentials only after a successful biometric match, which prevents unauthorised manual entry. Credentials are kept in an embedded SQLite store, and every access is logged so that user actions are traceable and audit-ready.

### Cost compared with the vendor option {#projects.iqmetric.cost}
<!-- source: resume -->
A vendor solution was priced at about USD 5,000 per machine. The in-house system cost about USD 167 per machine, so it saved roughly USD 5,000 per machine and removed the dependency on the vendor.

## Portfolio AI assistant (Jan 2026 onward) {#projects.portfolio_bot}

### Version 1: full-context assistant {#projects.portfolio_bot.v1}
<!-- source: github.com/midanish/my-portfolio functions/api/chat.js (tag v1-full-context-bot) -->
The first version of the portfolio chatbot runs as a Cloudflare Pages Function. For every question it loads the whole portfolio profile, places it in the system prompt, and asks the GLM-4.7-Flash model (through the Hugging Face router's chat-completions API) to answer only from that profile. There is no retrieval step: the model always sees everything. If the model is unavailable, a simple keyword-based fallback answers instead. It is single-turn and stateless. It stays online as the baseline for comparison.

### Version 2: two retrieval bots side by side {#projects.portfolio_bot.two_bots}
<!-- source: github.com/midanish/my-portfolio (branch two-bot-rag) -->
Version 2 adds a comparison page where one question is answered by two bots at once. Bot A is standard RAG: it searches short passages of this knowledge base with BM25 keyword search and embedding search, merges the two rankings with Reciprocal Rank Fusion, and passes the top five passages to the answer model. Bot B is structure-aware RAG inspired by the STAIR paper: a model picks up to three sections from the knowledge base's table of contents, the choice is checked against the list of real section IDs, and the text of those sections is passed to the same answer model. Both bots use the same documents, the same answer model and prompt, the same evidence budget and the same citation checks, so only the retrieval method differs.

### How the two bots are evaluated {#projects.portfolio_bot.evaluation}
<!-- source: github.com/midanish/my-portfolio eval/ and docs/ (branch two-bot-rag) -->
The two bots are compared on a hand-labelled set of questions, each tagged with the section that should answer it. Retrieval is scored separately from the answer: first-result recall, top-3 recall and mean reciprocal rank for retrieval; citation validity, correct refusals and latency for the answers. Some questions are held out and only run once at the end. A separate offline experiment fine-tunes a small language model (Qwen2.5-1.5B with LoRA) to output a valid section ID directly, closer to the original STAIR method. Results are published in the project's methodology report.

## Food image classification (Dec 2025) {#projects.food}

### Dataset {#projects.food.dataset}
<!-- source: github.com/midanish/Food-Image-Classification RESULTS.md -->
The food classifier uses 497 photos in six classes: ApplePie (93 images), BagelSandwich (45), Bibimbop (92), Bread (90), FriedRice (88) and Pork (89). The classes are imbalanced: BagelSandwich has about half as many images as the others. The photos are large (about 2,200 by 1,760 pixels on average) and are resized to 224 by 224 for the models. The data is split 80/20 into 397 training and 100 validation images.

### Model and training {#projects.food.model}
<!-- source: github.com/midanish/Food-Image-Classification train_fast.py, app.py -->
The final model is MobileNetV2 pretrained on ImageNet, with its classifier replaced by a six-class output layer (about 2.2 million parameters). It is fine-tuned with PyTorch using transfer learning and data augmentation: random horizontal flips, rotation of up to 15 degrees and colour jitter, with ImageNet normalisation. MobileNetV2 was chosen because its depthwise-separable convolutions make it light enough for fast inference on an ordinary CPU.

### Earlier model experiments {#projects.food.experiments}
<!-- source: github.com/midanish/Food-Image-Classification "Google_colab file" notebook -->
An earlier notebook compared seven models on the same data. Convolutional networks trained from scratch reached only about 33% to 54% accuracy and overfitted: they did much better on training images than on new ones. Transfer-learning models did far better: VGG16 with frozen features reached about 88% to 92% on test images, VGG19 about 90%, and ResNet18 about 96% on validation. These results led to choosing a pretrained, lightweight network for the final app.

### Results and limitations {#projects.food.results}
<!-- source: github.com/midanish/Food-Image-Classification; resume -->
The final MobileNetV2 model classified 95 of the 100 validation images correctly (95%). This is a validation figure, not an independent test result: the same 100 images were used while choosing the model, and there is no separate untouched test set. The app always picks one of the six classes, even for photos of other foods, so an "unsupported image" option is a planned improvement. The public repository is a fork of another repository, so not every file in it was written by Iqmal.

### Streamlit app {#projects.food.app}
<!-- source: github.com/midanish/Food-Image-Classification app.py -->
The classifier is served as a Streamlit web app with three pages: Model Info, Dataset Analysis and Prediction. On the Prediction page a user uploads a food photo and sees the predicted class with a confidence score for each class.

## Portable dental image analysis app (final-year project, Jul 2023) {#projects.dental}

### Overview and award {#projects.dental.overview}
<!-- source: resume; public/data/portfolio.json -->
For his final-year project at IIUM, Iqmal built a portable dental image-analysis application using a CNN (MobileNetV2). It analyses images from a small endoscopic camera on an Android phone, with no computer or cloud connection needed. The project reported 80% accuracy, was validated together with dental professionals, and won Best Overall Final Year Project in the Department of Mechatronics.

### Mobile architecture {#projects.dental.mobile}
<!-- source: github.com/midanish/Deep-Learning-Based-Mobile-Application-for-Dental-Caries-Detection -->
The Android app is written in Java. A USB endoscope connects to the phone as a UVC camera through the AndroidUSBCamera library (version 2.3.4). The trained MobileNetV2 model runs on the phone with PyTorch Mobile (version 1.12.1), so the image never leaves the device. The user captures an image, the app runs the model, and the predicted class is shown on screen.

### Known limitations and planned fixes {#projects.dental.limitations}
<!-- source: github.com/midanish/Deep-Learning-Based-Mobile-Application-for-Dental-Caries-Detection -->
In the public app code the two output classes are labelled "clean" and "plaque". The number shown as "Confidence Score" is the model's raw output score rather than a probability. The app reloads the model on each button press and runs it on the main thread, and it does not resize camera images to the size used in training. Fixing these (softmax probabilities, loading the model once, background inference and matching preprocessing) is the planned improvement. It is not a clinically approved diagnostic tool.

## Engineering room storage management system (Dec 2025) {#projects.storage}

### Borrow-and-return tracking {#projects.storage.overview}
<!-- source: resume; public/data/portfolio.json -->
At NXP, Iqmal built an inventory system for a shared engineering room using Microsoft Power Apps and PowerFX. Items are tracked by barcode: scanning logs who borrowed which item and when, and scanning it back closes the loop. Power Automate sends automatic alerts for overdue items and low stock. SharePoint is the data store, with role-based access control. It reduced manual data-entry errors by about 90%.

## Deep-learning coursework (2022) {#projects.coursework}

### Fashion-MNIST and fruit classification {#projects.coursework.classification}
<!-- source: github.com/midanish/Deep-Learning -->
In his deep-learning coursework Iqmal compared CNN architectures. On Fashion-MNIST a custom CNN reached 92.71% accuracy, AlexNet 91.92% and a pretrained ResNet-50 94.17%. On a fruit-classification dataset ResNet-50 reached 94.4%, rising to 99.1% after the dataset was cleaned up. One AlexNet run reported more than 100% training accuracy because of a counting bug, a reminder to sanity-check metrics. These are educational experiments, not production results.

### YOLOv5 object detection {#projects.coursework.yolov5}
<!-- source: github.com/midanish/Deep-Learning -->
The coursework also trained a YOLOv5s object detector on a CPU. Training stopped after 18 of 50 planned epochs, at precision 0.769, recall 0.858 and mAP@0.5 of 0.906 on its validation data.

## Two-way TCP chat application {#projects.tcp_chat}

### Socket chat with images {#projects.tcp_chat.overview}
<!-- source: github.com/midanish/Bi-Directional-Chat-Application-using-TCP-Communication -->
This is a small C# WinForms desktop app for two-way text and image chat over TCP, built to learn socket communication. It connects on 127.0.0.1 port 12345, separates messages with newlines, and sends images as Base64 text; images can be pasted from the clipboard. It supports a single client and does not detect disconnections. It is a networking exercise, not an AI chatbot.

# Education and credentials {#education}

## Degree {#education.degree}
<!-- source: resume; public/data/portfolio.json -->
Bachelor of Engineering (Mechatronics), International Islamic University Malaysia (IIUM), October 2019 to August 2023. Electives in Computer and Control: Machine Vision, Software Engineering and Intelligent Systems. Dean's List in 2019/2020 and 2022/2023. He also took a robotics hardware course (MCTE 4362) covering underwater vehicles, drones, ground robots, swarm robotics and humanoids.

## Certificates {#education.certificates}
<!-- source: resume; public/data/portfolio.json -->
AI Engineering Professional Certificate from IBM (August 2024). AI and Data Specialist Program Industry Joint Certificate from Aerodyne Group and Yayasan Peneraju (January 2024). Registered Graduate Engineer with the Board of Engineers Malaysia (BEM, December 2023). Deep Learning and Computer Vision (Proficient) from the Ministry of Education Malaysia (September 2022).

## Awards {#education.awards}
<!-- source: resume; public/data/portfolio.json -->
Technical Excellence Award (TEA) Bronze from NXP Semiconductors (Q3 2025). Best Overall Final Year Project, Department of Mechatronics, IIUM (2022/2023). Dean's List Awards, IIUM (2019/2020 and 2022/2023).
